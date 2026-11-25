import "server-only";
import type { CurrentUser } from "./auth";
import { getSupabaseServer, isMockMode } from "./supabase-server";

/** ข้อมูลการ acknowledge ของ alarm 1 รายการ (ส่งไปเบราว์เซอร์ได้) */
export interface AckInfo {
  at: string;
  by: string | null;
}

/**
 * สถานะ ack ของ alarm ตาม id
 * คืน null = ปิดฟีเจอร์ (โหมดจำลอง / ยังไม่ได้รัน supabase/alarm_acks.sql / โหลดไม่สำเร็จ)
 * → หน้าเว็บจะไม่ไฮไลต์อะไร แทนที่จะไฮไลต์ทุกแถว
 */
export async function getAcks(ids: string[]): Promise<Record<string, AckInfo> | null> {
  if (isMockMode()) return null;
  if (ids.length === 0) return {};
  const { data, error } = await getSupabaseServer()
    .from("alarm_acks")
    .select("event_id,acked_at,acked_by_email")
    .in("event_id", ids);
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    if (!missing) console.warn("[alarm_acks]", error.message);
    return null;
  }
  const out: Record<string, AckInfo> = {};
  for (const r of data ?? []) {
    const row = r as { event_id: string; acked_at: string; acked_by_email: string | null };
    out[row.event_id] = { at: row.acked_at, by: row.acked_by_email };
  }
  return out;
}

/** ack หลายรายการ (รายการที่ ack ไปแล้วคงข้อมูลเดิม ไม่ทับคนที่ ack ก่อน) */
export async function ackAlarms(user: CurrentUser, ids: string[]): Promise<void> {
  const { error } = await getSupabaseServer()
    .from("alarm_acks")
    .upsert(
      ids.map((id) => ({ event_id: id, acked_by: user.id, acked_by_email: user.email })),
      { onConflict: "event_id", ignoreDuplicates: true },
    );
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    throw new Error(missing ? "ยังไม่มีตาราง alarm_acks — รัน supabase/alarm_acks.sql ก่อน" : error.message);
  }
}
