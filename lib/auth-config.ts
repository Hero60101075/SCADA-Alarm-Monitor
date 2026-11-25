/**
 * ค่าตั้งค่าของ Login with Google (Supabase Auth) — ใช้ได้ทั้งใน proxy.ts และฝั่ง server
 * (ไฟล์นี้ไม่ import "server-only" เพราะ proxy ต้องใช้ แต่ห้าม import จาก client component)
 */

/** path ที่เข้าได้โดยไม่ต้อง login */
export const PUBLIC_PATHS = ["/login", "/auth/callback"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isMockModeEnv(): boolean {
  return process.env.USE_MOCK_DATA?.trim().toLowerCase() === "true";
}

/**
 * URL + publishable (anon) key ของ Supabase สำหรับ Auth
 * คืน null ถ้ายังไม่ได้ตั้งค่า (หน้า /login จะแสดงข้อความบอก)
 */
export function getAuthConfig(): { url: string; key: string } | null {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl || !key) return null;
  try {
    return { url: new URL(rawUrl).origin, key };
  } catch {
    return null;
  }
}

/** กันการ redirect ไปเว็บอื่นหลัง login: รับเฉพาะ path ภายในเว็บนี้ */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
