"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServer, isMockMode } from "@/lib/supabase-server";

/**
 * บันทึกการเข้าชมหน้า 1 ครั้งลงตาราง public.visit_logs (ดู supabase/visit_logs.sql)
 * - เรียกจาก <VisitLogger> ทุกครั้งที่เปลี่ยนหน้า (ไม่นับ auto refresh / prefetch)
 * - ผู้ใช้อ่านจาก session ฝั่ง server เสมอ ไม่เชื่อค่าจาก client
 * - ล้มเหลวได้เงียบๆ: การบันทึกไม่ควรทำให้หน้าเว็บพัง
 */
export async function logVisitAction(path: string): Promise<void> {
  if (isMockMode()) return;
  if (typeof path !== "string" || !path.startsWith("/")) return;

  const user = await getCurrentUser();
  if (!user) return;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const { error } = await getSupabaseServer()
      .from("visit_logs")
      .insert({ user_id: user.id, email: user.email, path: path.slice(0, 500), ip, user_agent: userAgent });
    if (error) console.warn("[visit_logs]", error.message);
  } catch (err) {
    console.warn("[visit_logs]", err);
  }
}
