"use server";

import { redirect } from "next/navigation";
import {
  DataError,
  deleteScadaEvent,
  getAlarmById,
  insertScadaEvent,
} from "@/lib/alarms";
import { getCurrentUser } from "@/lib/auth";
import { logSubmission } from "@/lib/submissions";
import { ConfigError, isMockMode } from "@/lib/supabase-server";
import {
  checkPassword,
  clearTestSession,
  createTestSession,
  forgetTestedId,
  getTestedIds,
  isTestAuthenticated,
  isTestPasswordConfigured,
  rememberTestedId,
} from "@/lib/test-auth";
import { alarmFormSchema, toFieldErrors, uuidSchema, type AlarmFormInput, type FieldErrors } from "@/lib/validation";
import type { AlarmRow } from "@/lib/types";

/* ---------- login / logout ---------- */

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isTestPasswordConfigured()) {
    return { error: "ระบบยังไม่ได้ตั้งค่า TEST_PAGE_PASSWORD ใน .env.local จึงเข้าหน้าทดสอบไม่ได้" };
  }
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "กรุณากรอกรหัสผ่าน" };
  }
  if (!checkPassword(password)) {
    // หน่วงเวลาเล็กน้อยเพื่อลดการเดารหัสผ่านแบบรัวๆ
    await new Promise((r) => setTimeout(r, 800));
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  await createTestSession();
  redirect("/test");
}

export async function logoutAction(): Promise<void> {
  await clearTestSession();
  redirect("/test/login");
}

/* ---------- helpers ---------- */

/** ต้อง login with Google และผ่านรหัสผ่านหน้าทดสอบ (ตรวจซ้ำทุก action ไม่พึ่ง proxy) */
async function isAuthorized(): Promise<boolean> {
  return (await getCurrentUser()) !== null && (await isTestAuthenticated());
}

const NOT_AUTHORIZED = "เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบหน้าทดสอบใหม่";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConfigError) return err.message;
  if (err instanceof DataError) return err.userMessage;
  console.error("[test/actions]", err);
  return fallback;
}

/* ---------- เพิ่ม alarm ---------- */

export type CreateAlarmResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function createAlarmAction(input: AlarmFormInput): Promise<CreateAlarmResult> {
  const user = await getCurrentUser();
  if (!user || !(await isTestAuthenticated())) return { ok: false, error: NOT_AUTHORIZED };

  const parsed = alarmFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน", fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    const d = parsed.data;
    // consent ใช้ตรวจสอบเท่านั้น ไม่บันทึกลงฐานข้อมูล
    const id = await insertScadaEvent({
      event_time: d.event_time,
      sub: d.sub,
      point: d.point,
      point_type: d.point_type,
      value: d.value,
      low_th: d.low_th,
      high_th: d.high_th,
      notify_email: d.notify_email,
      notify_line_user_id: d.notify_line_user_id,
    });
    await rememberTestedId(id);
    // นับจำนวนครั้งที่ส่ง (ข้ามในโหมดข้อมูลจำลอง)
    if (!isMockMode()) await logSubmission(user, { id, sub: d.sub, point: d.point, point_type: d.point_type });
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: errorMessage(err, "บันทึก alarm ไม่สำเร็จ") };
  }
}

/* ---------- ติดตามผล ---------- */

export type AlarmStatusResult =
  | { ok: true; row: AlarmRow | null }
  | { ok: false; error: string };

export async function getAlarmStatusAction(id: string): Promise<AlarmStatusResult> {
  if (!(await isAuthorized())) return { ok: false, error: NOT_AUTHORIZED };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "id ไม่ถูกต้อง" };
  try {
    return { ok: true, row: await getAlarmById(id) };
  } catch (err) {
    return { ok: false, error: errorMessage(err, "โหลดสถานะไม่สำเร็จ") };
  }
}

/* ---------- ลบ ---------- */

export type DeleteAlarmResult = { ok: true } | { ok: false; error: string };

export async function deleteAlarmAction(id: string): Promise<DeleteAlarmResult> {
  if (!(await isAuthorized())) return { ok: false, error: NOT_AUTHORIZED };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "id ไม่ถูกต้อง" };

  // ลบได้เฉพาะแถวที่เพิ่มจากหน้าทดสอบในเบราว์เซอร์นี้ กันการลบ alarm จริงโดยไม่ตั้งใจ
  const tested = await getTestedIds();
  if (!tested.includes(id)) {
    return { ok: false, error: "ลบได้เฉพาะ alarm ที่เพิ่มจากหน้าทดสอบนี้เท่านั้น" };
  }

  try {
    await deleteScadaEvent(id);
    await forgetTestedId(id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err, "ลบ alarm ไม่สำเร็จ") };
  }
}
