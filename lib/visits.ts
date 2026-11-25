import "server-only";
import { getSupabaseServer } from "./supabase-server";

export interface VisitRow {
  id: number;
  visited_at: string;
  email: string | null;
  path: string;
  ip: string | null;
  user_agent: string | null;
}

export interface VisitorSummary {
  email: string;
  visits: number;
  lastVisit: string;
  firstVisit: string;
}

/** จำนวนแถวล่าสุดที่ดึงมาแสดง/สรุป */
export const VISIT_LIMIT = 1000;

export class VisitsError extends Error {}

/** ดึงประวัติการเข้าชมล่าสุด (service role — เรียกได้เฉพาะหลังตรวจว่าเป็น ADMIN แล้ว) */
export async function getRecentVisits(email: string | null): Promise<VisitRow[]> {
  let q = getSupabaseServer()
    .from("visit_logs")
    .select("id,visited_at,email,path,ip,user_agent")
    .order("visited_at", { ascending: false })
    .limit(VISIT_LIMIT);
  if (email) q = q.eq("email", email);
  const { data, error } = await q;
  if (error) {
    // 42P01 / PGRST205 = ยังไม่มีตาราง
    const missing = error.code === "42P01" || error.code === "PGRST205";
    throw new VisitsError(
      missing ? "ยังไม่มีตาราง visit_logs — รัน supabase/visit_logs.sql ใน Supabase SQL Editor ก่อน" : `โหลดประวัติการเข้าชมไม่สำเร็จ (${error.message})`,
    );
  }
  return (data ?? []) as VisitRow[];
}

export function summarize(rows: VisitRow[]): VisitorSummary[] {
  const by = new Map<string, VisitorSummary>();
  for (const r of rows) {
    const key = r.email ?? "(ไม่ทราบอีเมล)";
    const s = by.get(key);
    if (!s) by.set(key, { email: key, visits: 1, lastVisit: r.visited_at, firstVisit: r.visited_at });
    else {
      s.visits++;
      if (r.visited_at > s.lastVisit) s.lastVisit = r.visited_at;
      if (r.visited_at < s.firstVisit) s.firstVisit = r.visited_at;
    }
  }
  return [...by.values()].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

/** แปลง user agent เป็นข้อความสั้นๆ เช่น "Chrome · Windows" */
export function shortUserAgent(ua: string | null): string {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "อื่นๆ";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "อื่นๆ";
  return `${browser} · ${os}`;
}
