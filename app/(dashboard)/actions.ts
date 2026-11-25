"use server";

import { ackAlarms } from "@/lib/acks";
import { getCurrentUser } from "@/lib/auth";
import { isMockMode } from "@/lib/supabase-server";
import { uuidSchema } from "@/lib/validation";

export type AckResult = { ok: true } | { ok: false; error: string };

/** Acknowledge alarm (ผู้ใช้ที่ login แล้วทุกคน ทั้ง USER และ ADMIN) */
export async function ackAlarmsAction(ids: string[]): Promise<AckResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  if (isMockMode()) return { ok: false, error: "โหมดข้อมูลจำลองไม่รองรับการ acknowledge" };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || !ids.every((id) => uuidSchema.safeParse(id).success)) {
    return { ok: false, error: "รายการ alarm ไม่ถูกต้อง" };
  }
  try {
    await ackAlarms(user, [...new Set(ids)]);
    return { ok: true };
  } catch (err) {
    console.error("[ack]", err);
    return { ok: false, error: "Acknowledge ไม่สำเร็จ กรุณาลองใหม่" };
  }
}
