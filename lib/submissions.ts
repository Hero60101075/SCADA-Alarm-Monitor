import "server-only";
import type { CurrentUser } from "./auth";
import { getSupabaseServer } from "./supabase-server";

export interface SubmissionRow {
  id: number;
  submitted_at: string;
  email: string | null;
  event_id: string | null;
  sub: string | null;
  point: string | null;
  point_type: string | null;
}

/** จำนวนแถวล่าสุดที่ดึงมาแสดง/นับ */
export const SUBMISSION_LIMIT = 1000;

export class SubmissionsError extends Error {}

/**
 * บันทึกการส่งข้อมูลสำเร็จ 1 ครั้ง (เรียกหลัง insert scada_events สำเร็จ)
 * ล้มเหลวได้เงียบๆ: alarm ถูกส่งไปแล้ว การนับไม่ควรทำให้ผู้ใช้เห็นว่าส่งไม่สำเร็จ
 */
export async function logSubmission(
  user: CurrentUser,
  event: { id: string; sub: string; point: string; point_type: string },
): Promise<void> {
  try {
    const { error } = await getSupabaseServer().from("alarm_submissions").insert({
      user_id: user.id,
      email: user.email,
      event_id: event.id,
      sub: event.sub,
      point: event.point,
      point_type: event.point_type,
    });
    if (error) console.warn("[alarm_submissions]", error.message);
  } catch (err) {
    console.warn("[alarm_submissions]", err);
  }
}

/** ประวัติการส่งข้อมูลล่าสุด (service role — เรียกได้เฉพาะหลังตรวจว่าเป็น ADMIN แล้ว) */
export async function getRecentSubmissions(email: string | null): Promise<SubmissionRow[]> {
  let q = getSupabaseServer()
    .from("alarm_submissions")
    .select("id,submitted_at,email,event_id,sub,point,point_type")
    .order("submitted_at", { ascending: false })
    .limit(SUBMISSION_LIMIT);
  if (email) q = q.eq("email", email);
  const { data, error } = await q;
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    throw new SubmissionsError(
      missing
        ? "ยังไม่มีตาราง alarm_submissions — รัน supabase/alarm_submissions.sql ใน Supabase SQL Editor ก่อน"
        : `โหลดประวัติการส่งข้อมูลไม่สำเร็จ (${error.message})`,
    );
  }
  return (data ?? []) as SubmissionRow[];
}

/** นับจำนวนครั้งที่ส่งต่ออีเมล */
export function countByEmail(rows: SubmissionRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = r.email ?? "(ไม่ทราบอีเมล)";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}
