import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { uuidSchema } from "./validation";

/**
 * การยืนยันตัวตนสำหรับหน้า /test
 * - เทียบรหัสผ่านกับ TEST_PAGE_PASSWORD ฝั่ง server แบบ constant-time
 * - cookie เก็บเฉพาะ token ที่ลงนามด้วย HMAC (ไม่มีรหัสผ่านอยู่ใน cookie) และเป็น httpOnly
 * - เปลี่ยน TEST_PAGE_PASSWORD = session เดิมใช้ไม่ได้ทันที
 */

const SESSION_COOKIE = "scada_test_session";
const TESTED_IDS_COOKIE = "scada_tested_ids";
const SESSION_TTL_SEC = 8 * 60 * 60; // 8 ชั่วโมง (ประมาณหนึ่งกะ)
const MAX_TESTED_IDS = 10;

function configuredPassword(): string | null {
  const p = process.env.TEST_PAGE_PASSWORD;
  return p && p.length > 0 ? p : null;
}

export function isTestPasswordConfigured(): boolean {
  return configuredPassword() !== null;
}

function signingKey(password: string): Buffer {
  return createHash("sha256").update(`scada-test-session:v1:${password}`).digest();
}

function sign(expiresAt: number, password: string): string {
  return createHmac("sha256", signingKey(password)).update(String(expiresAt)).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const pw = configuredPassword();
  if (!pw) return false;
  return safeEqual(input, pw);
}

async function cookieBaseOptions() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    // ใช้ Secure เมื่อเข้าผ่าน https (localhost / LAN แบบ http ยังล็อกอินได้)
    secure: proto === "https",
  };
}

export async function createTestSession(): Promise<void> {
  const pw = configuredPassword();
  if (!pw) throw new Error("TEST_PAGE_PASSWORD is not configured");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const token = `${expiresAt}.${sign(expiresAt, pw)}`;
  (await cookies()).set(SESSION_COOKIE, token, { ...(await cookieBaseOptions()), maxAge: SESSION_TTL_SEC });
}

export async function clearTestSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function isTestAuthenticated(): Promise<boolean> {
  // อ่าน cookie ก่อนเสมอ เพื่อให้การตรวจสอบเกิดขึ้นตอน request (ไม่ถูก prerender ตอน build)
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const pw = configuredPassword();
  if (!pw) return false;
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, sign(exp, pw));
}

/* ---------- รายการ id ที่ทดสอบจากเบราว์เซอร์นี้ ----------
 * ไม่มีคอลัมน์ในฐานข้อมูลที่บอกว่าแถวไหนมาจากหน้าทดสอบ (และห้ามแก้ schema)
 * จึงเก็บ id ที่เพิ่มผ่านหน้านี้ไว้ใน httpOnly cookie และอนุญาตให้ลบได้เฉพาะ id เหล่านี้
 * เพื่อกันการลบ alarm จริงโดยไม่ตั้งใจ
 */

export async function getTestedIds(): Promise<string[]> {
  const raw = (await cookies()).get(TESTED_IDS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => uuidSchema.safeParse(v).success).slice(0, MAX_TESTED_IDS);
  } catch {
    return [];
  }
}

async function writeTestedIds(ids: string[]): Promise<void> {
  (await cookies()).set(TESTED_IDS_COOKIE, JSON.stringify(ids.slice(0, MAX_TESTED_IDS)), {
    ...(await cookieBaseOptions()),
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function rememberTestedId(id: string): Promise<void> {
  const ids = await getTestedIds();
  await writeTestedIds([id, ...ids.filter((x) => x !== id)]);
}

export async function forgetTestedId(id: string): Promise<void> {
  const ids = await getTestedIds();
  await writeTestedIds(ids.filter((x) => x !== id));
}
