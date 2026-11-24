import "server-only";
import { PRESETS } from "./presets";
import type { AlarmRow, NewScadaEvent, Severity } from "./types";
import { maskEmail, maskLineUserId } from "./mask";
import type { MaskedRecipients } from "./types";

/**
 * ข้อมูลจำลองสำหรับทดสอบ UI (USE_MOCK_DATA=true)
 * - ไม่เชื่อมต่อ Supabase และไม่ทำให้ Make ทำงาน
 * - ผล "วิเคราะห์" เป็นกฎตายตัวในไฟล์นี้ ไม่ได้มาจาก AI จริง
 * - เก็บใน memory ของ process (หายเมื่อรีสตาร์ต dev server)
 */

interface MockAnalysis {
  caption: string;
  severity: Severity;
  recommended_action: string;
  ai_model: string;
}

interface MockRecord extends NewScadaEvent {
  id: string;
  received_at: string;
  analyzeAt: number;
  analysis: MockAnalysis | null;
}

interface MockState {
  rows: MockRecord[];
}

const g = globalThis as typeof globalThis & { __scadaMockState?: MockState };

function mockAnalyze(e: NewScadaEvent): MockAnalysis {
  const p = e.point.toUpperCase();
  const base = { ai_model: "mock-rules (ข้อมูลจำลอง)" };

  if (e.point_type === "AI") {
    const high = e.high_th !== null && e.value > e.high_th;
    const low = e.low_th !== null && e.value < e.low_th;
    if (high || low) {
      return {
        ...base,
        caption: "ABNORMAL",
        severity: "CRITICAL",
        recommended_action: [
          `ตรวจสอบค่า ${e.point} เทียบกับมิเตอร์หน้างาน`,
          high ? "ค่าสูงกว่า High threshold ให้ประเมินภาระโหลดของสายส่ง" : "ค่าต่ำกว่า Low threshold ให้ตรวจสอบแหล่งจ่ายและ PT/CT",
          "แจ้ง Dispatch พร้อมค่าที่อ่านได้",
        ].join("\n"),
      };
    }
    return {
      ...base,
      caption: "NORMAL",
      severity: "INFO",
      recommended_action: "ค่าอยู่ในช่วงปกติ\nเฝ้าติดตามแนวโน้มต่อเนื่อง",
    };
  }

  if (e.point_type === "ST") {
    const caption = p.includes("OPEN") ? (e.value === 1 ? "OPEN" : "CLOSE") : e.value === 1 ? "CLOSE" : "OPEN";
    return {
      ...base,
      caption,
      severity: caption === "OPEN" ? "WARNING" : "INFO",
      recommended_action: [
        `ยืนยันสถานะ ${e.point} กับหน้าจอระบบควบคุมและหน้างาน`,
        "ตรวจสอบว่ามีการสั่งการตามแผนงานหรือไม่",
        "บันทึกเหตุการณ์ลงสมุดบันทึกประจำกะ",
      ].join("\n"),
    };
  }

  const critical = /LOCKOUT|TRIP|RELAY/.test(p);
  return {
    ...base,
    caption: "ALARM",
    severity: critical ? "CRITICAL" : "WARNING",
    recommended_action: critical
      ? [
          "แจ้ง Dispatch ทันทีและรอคำสั่ง",
          `ส่งเจ้าหน้าที่ตรวจสอบ ${e.point} ที่หน้างาน`,
          "ตรวจสอบ Event/Fault record ของรีเลย์ที่เกี่ยวข้อง",
          "ห้ามสั่ง Reset จนกว่าจะทราบสาเหตุ",
        ].join("\n")
      : [
          `ตรวจสอบ ${e.point} ที่หน้างาน`,
          "เฝ้าติดตามว่าจะยกระดับเป็น alarm ขั้นถัดไปหรือไม่",
          "แจ้งผู้ควบคุมกะทราบ",
        ].join("\n"),
  };
}

function seed(): MockState {
  const now = Date.now();
  type SeedEvent = Omit<NewScadaEvent, "notify_email" | "notify_line_user_id">;
  const extra: SeedEvent[] = [
    { event_time: "11:02", sub: "SB2", point: "TR1 OIL TEMPERATURE", point_type: "AI", value: 92, low_th: null, high_th: 85 },
    { event_time: "11:05", sub: "SB2", point: "22KV BUS VOLTAGE", point_type: "AI", value: 21.2, low_th: 21.5, high_th: 23.5 },
    { event_time: "11:07", sub: "SB2", point: "BATTERY CHARGER FAIL", point_type: "DI", value: 1, low_th: null, high_th: null },
  ];
  const seedEvents: SeedEvent[] = [
    ...PRESETS.map((p) => ({
      event_time: p.event_time,
      sub: p.sub,
      point: p.point,
      point_type: p.point_type,
      value: Number(p.value),
      low_th: p.low_th === "" ? null : Number(p.low_th),
      high_th: p.high_th === "" ? null : Number(p.high_th),
    })),
    ...extra,
  ];
  const events: NewScadaEvent[] = seedEvents.map((e) => ({ ...e, notify_email: null, notify_line_user_id: null }));
  const n = events.length;
  const rows: MockRecord[] = events.map((e, i) => {
    const receivedMs = now - (n - i) * 6 * 60_000;
    const isLastTwo = i >= n - 2;
    return {
      ...e,
      event_time: `${e.event_time}:00`,
      id: crypto.randomUUID(),
      received_at: new Date(receivedMs).toISOString(),
      // สองแถวล่าสุดจะ "วิเคราะห์เสร็จ" หลังเปิดแอปไม่นาน เพื่อให้เห็น skeleton และไฮไลต์
      analyzeAt: isLastTwo ? now + (i === n - 1 ? 25_000 : 12_000) : receivedMs + 4_000 + i * 700,
      analysis: null,
    };
  });
  return { rows: rows.reverse() };
}

function state(): MockState {
  if (!g.__scadaMockState) g.__scadaMockState = seed();
  return g.__scadaMockState;
}

function materialize(r: MockRecord, now: number): AlarmRow {
  if (!r.analysis && now >= r.analyzeAt) r.analysis = mockAnalyze(r);
  const a = r.analysis;
  return {
    id: r.id,
    event_time: r.event_time,
    sub: r.sub,
    point: r.point,
    point_type: r.point_type,
    value: r.value,
    low_th: r.low_th,
    high_th: r.high_th,
    caption: a?.caption ?? null,
    severity: a?.severity ?? null,
    recommended_action: a?.recommended_action ?? null,
    ai_model: a?.ai_model ?? null,
    received_at: r.received_at,
    analyzed_at: a ? new Date(r.analyzeAt).toISOString() : null,
  };
}

/** แถวทั้งหมดเรียง received_at ใหม่สุดก่อน */
export function mockAll(): AlarmRow[] {
  const now = Date.now();
  return state()
    .rows.map((r) => materialize(r, now))
    .sort((a, b) => b.received_at.localeCompare(a.received_at));
}

export function mockInsert(e: NewScadaEvent): string {
  const now = Date.now();
  const id = crypto.randomUUID();
  state().rows.unshift({
    ...e,
    event_time: e.event_time.length === 5 ? `${e.event_time}:00` : e.event_time,
    id,
    received_at: new Date(now).toISOString(),
    analyzeAt: now + 5_000 + Math.floor(Math.random() * 6_000),
    analysis: null,
  });
  return id;
}

export function mockDelete(id: string): boolean {
  const s = state();
  const before = s.rows.length;
  s.rows = s.rows.filter((r) => r.id !== id);
  return s.rows.length < before;
}

/** ผู้รับแจ้งเตือน (ปิดบังแล้ว) ของ id ที่ระบุ */
export function mockRecipients(ids: string[]): Record<string, MaskedRecipients> {
  const out: Record<string, MaskedRecipients> = {};
  for (const r of state().rows) {
    if (ids.includes(r.id)) {
      out[r.id] = { email: maskEmail(r.notify_email), line: maskLineUserId(r.notify_line_user_id) };
    }
  }
  return out;
}
