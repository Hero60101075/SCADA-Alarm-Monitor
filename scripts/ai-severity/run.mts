/**
 * Auto test: ส่ง preset ทุกข้อไปให้ bigbotagent (model gemini-3.5-flash-lite) วิเคราะห์ตรงๆ แล้วเทียบ severity กับค่า `expected` ใน lib/presets.ts
 *
 * - เรียก BIGBOT_API_URL โดยตรง ไม่ผ่าน Supabase / Make → ไม่ส่ง Gmail/LINE และไม่เสีย credit ของ Make
 * - ใช้ prompt จาก scripts/ai-severity/prompt.txt (ควรวาง prompt เดียวกับใน Make)
 *
 * รัน:  npm run test:ai -- [--only 1,5,22] [--runs 3] [--model gemini-3.5-flash-lite] [--no-fail]
 * ต้องมี BIGBOT_API_URL และ BIGBOT_API_KEY ใน .env.local
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PRESETS, type AlarmPreset } from "../../lib/presets.ts";

type Severity = "CRITICAL" | "WARNING" | "INFO";
const SEVERITIES: readonly Severity[] = ["CRITICAL", "WARNING", "INFO"];

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPT_FILE = join(HERE, "prompt.txt");
const RESULTS_DIR = join(HERE, "results");

const { values: args } = parseArgs({
  options: {
    only: { type: "string" },
    runs: { type: "string", default: "1" },
    model: { type: "string" },
    "no-fail": { type: "boolean", default: false },
  },
});

const API_URL = process.env.BIGBOT_API_URL;
const API_KEY = process.env.BIGBOT_API_KEY;
const MODEL = args.model ?? process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const RUNS = Math.max(1, Number(args.runs) || 1);

if (!API_URL || !API_KEY) {
  console.error("ไม่พบ BIGBOT_API_URL หรือ BIGBOT_API_KEY — ใส่ใน .env.local");
  process.exit(2);
}

const template = readFileSync(PROMPT_FILE, "utf8");
const usingDefaultPrompt = template.includes("### DEFAULT PROMPT");

/** เวลาปัจจุบันตามเวลาไทย HH:MM — ให้ตรงกับที่ฟอร์มใช้ตอนกด preset */
function bangkokNowHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function buildPrompt(p: AlarmPreset): string {
  const vars: Record<string, string> = {
    // Make ได้เวลาจากคอลัมน์ time ของ Postgres จึงเป็น HH:MM:SS
    event_time: `${bangkokNowHHMM()}:00`,
    sub: p.sub,
    point: p.point,
    point_type: p.point_type,
    value: p.value,
    // threshold ที่เป็น null ใน Make จะแทนค่าเป็นช่องว่าง
    low_th: p.low_th,
    high_th: p.high_th,
  };
  // รองรับทั้ง {{sub}} และรูปแบบ Make เช่น {{1.record.sub}} (ใช้ชื่อท้ายสุดหลังจุด)
  const prompt = template
    .split("\n")
    .filter((l) => !l.startsWith("###"))
    .join("\n")
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, path: string) => vars[path.split(".").pop()!] ?? m)
    .trim();
  const leftover = prompt.match(/\{\{[^}]*\}\}/g);
  if (leftover) throw new Error(`prompt มีตัวแปรที่แทนค่าไม่ได้: ${[...new Set(leftover)].join(", ")}`);
  return prompt;
}

interface Analysis {
  severity: Severity | null;
  caption: string | null;
  actions: string[];
  raw: string;
}

function parseAnalysis(raw: string): Analysis {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    const j = JSON.parse(cleaned) as Record<string, unknown>;
    const sev = String(j.severity ?? "").toUpperCase();
    const ra = j.recommended_action;
    return {
      severity: SEVERITIES.includes(sev as Severity) ? (sev as Severity) : null,
      caption: typeof j.caption === "string" ? j.caption : null,
      actions: Array.isArray(ra) ? ra.map(String) : typeof ra === "string" ? ra.split("\n").filter(Boolean) : [],
      raw,
    };
  } catch {
    // ไม่ใช่ JSON — ลองหา severity จากข้อความ
    const m = raw.toUpperCase().match(/\b(CRITICAL|WARNING|INFO)\b/);
    return { severity: (m?.[1] as Severity) ?? null, caption: null, actions: [], raw };
  }
}

/** เรียก bigbotagent (รูปแบบ OpenAI-compatible: /v1/chat/completions) ด้วย model ที่กำหนด */
async function callModel(prompt: string): Promise<{ text: string; ms: number }> {
  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });
  for (let attempt = 1; ; attempt++) {
    const t0 = performance.now();
    const res = await fetch(API_URL!, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
      body,
    });
    const ms = Math.round(performance.now() - t0);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = 2 ** attempt * 1000;
      console.warn(`  ! HTTP ${res.status} — รอ ${wait / 1000}s แล้วลองใหม่ (${attempt}/4)`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | { text?: string }[] } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : (content ?? []).map((c) => c.text ?? "").join("");
    if (!text) throw new Error(`response ไม่มี choices[0].message.content: ${JSON.stringify(data).slice(0, 300)}`);
    return { text, ms };
  }
}

const DOT: Record<Severity, string> = { CRITICAL: "\x1b[31m●\x1b[0m", WARNING: "\x1b[33m●\x1b[0m", INFO: "\x1b[36m●\x1b[0m" };
const fmtSev = (s: Severity | null) => (s ? `${DOT[s]} ${s.padEnd(8)}` : "  ?       ");

const only = args.only
  ? new Set(args.only.split(",").map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= PRESETS.length))
  : null;
const cases = PRESETS.map((p, i) => ({ no: i + 1, p })).filter((c) => !only || only.has(c.no));

console.log(`Model: ${MODEL} · ${cases.length} เคส × ${RUNS} รอบ`);
if (usingDefaultPrompt) {
  console.log("\x1b[33m⚠ ใช้ prompt ตัวอย่าง — ผลอาจต่างจาก Make ให้วาง prompt จริงใน scripts/ai-severity/prompt.txt\x1b[0m");
}
console.log("");

interface CaseResult {
  no: number;
  sub: string;
  point: string;
  point_type: string;
  expected: Severity;
  runs: { severity: Severity | null; caption: string | null; actions: string[]; ms: number; error?: string; raw?: string }[];
  majority: Severity | null;
  match: boolean;
  stable: boolean;
}

const results: CaseResult[] = [];
for (const { no, p } of cases) {
  const runs: CaseResult["runs"] = [];
  for (let r = 0; r < RUNS; r++) {
    try {
      const { text, ms } = await callModel(buildPrompt(p));
      const a = parseAnalysis(text);
      runs.push({ severity: a.severity, caption: a.caption, actions: a.actions, ms, raw: a.severity ? undefined : a.raw });
    } catch (e) {
      runs.push({ severity: null, caption: null, actions: [], ms: 0, error: (e as Error).message });
    }
  }
  const counts = new Map<Severity, number>();
  runs.forEach((r) => r.severity && counts.set(r.severity, (counts.get(r.severity) ?? 0) + 1));
  const majority = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const match = majority === p.expected;
  const stable = counts.size <= 1;
  results.push({ no, sub: p.sub, point: p.point, point_type: p.point_type, expected: p.expected, runs, majority, match, stable });

  const mark = match ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  const spread = RUNS > 1 ? ` [${runs.map((r) => r.severity?.[0] ?? "?").join("")}]` : "";
  const avgMs = Math.round(runs.reduce((s, r) => s + r.ms, 0) / runs.length);
  const err = runs.find((r) => r.error)?.error;
  console.log(
    `${mark} #${String(no).padStart(2)}  คาด ${fmtSev(p.expected)} ได้ ${fmtSev(majority)}${spread}  ${String(avgMs).padStart(5)}ms  ${p.point_type} · ${p.sub} · ${p.point}` +
      (err ? `\n     error: ${err}` : ""),
  );
}

const pass = results.filter((r) => r.match).length;
const unstable = results.filter((r) => !r.stable);
console.log(`\nตรงกับที่คาด ${pass}/${results.length} เคส (${Math.round((pass / results.length) * 100)}%)`);
for (const s of SEVERITIES) {
  const exp = results.filter((r) => r.expected === s);
  if (exp.length) console.log(`  ${DOT[s]} ${s.padEnd(8)} ${exp.filter((r) => r.match).length}/${exp.length}`);
}
if (RUNS > 1) console.log(`ผลไม่คงที่ระหว่างรอบ: ${unstable.length ? unstable.map((r) => `#${r.no}`).join(", ") : "ไม่มี"}`);

const mismatches = results.filter((r) => !r.match);
if (mismatches.length) {
  console.log("\nเคสที่ไม่ตรง:");
  for (const r of mismatches) console.log(`  #${r.no} ${r.point}: คาด ${r.expected} → ได้ ${r.majority ?? "อ่านผลไม่ได้"}`);
}

mkdirSync(RESULTS_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = join(RESULTS_DIR, `${stamp}.json`);
writeFileSync(
  outFile,
  JSON.stringify({ model: MODEL, runs: RUNS, defaultPrompt: usingDefaultPrompt, pass, total: results.length, results }, null, 2),
);
console.log(`\nบันทึกผลละเอียดที่ ${outFile}`);

// ใช้ exitCode แทน process.exit() — บน Windows การ exit ทันทีขณะ fetch ยังปิด connection อยู่ทำให้ libuv assert fail
if (mismatches.length && !args["no-fail"]) process.exitCode = 1;
