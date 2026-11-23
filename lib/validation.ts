import { z } from "zod";
import { POINT_TYPES } from "./types";

const NUMERIC_RE = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

/** ให้ตรงกับ check constraint ของ scada_events.notify_email (รูปแบบอีเมลทั่วไป) */
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
/** ให้ตรงกับ check constraint ของ scada_events.notify_line_user_id */
export const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/;

const optionalEmail = z
  .string()
  .trim()
  .max(254, "อีเมลยาวเกินไป")
  .refine((s) => s === "" || EMAIL_RE.test(s), "รูปแบบอีเมลไม่ถูกต้อง เช่น name@gmail.com")
  .transform((s) => (s === "" ? null : s));

const optionalLineUserId = z
  .string()
  .trim()
  .refine((s) => !s.startsWith("@"), "นี่คือ LINE ID สำหรับแอดเพื่อน ไม่ใช่ User ID — ให้ใช้ค่าที่บอทตอบกลับ (ขึ้นต้นด้วย U)")
  .refine(
    (s) => s === "" || s.startsWith("@") || LINE_USER_ID_RE.test(s),
    "LINE User ID ต้องขึ้นต้นด้วย U ตามด้วยตัวเลข/a-f ตัวพิมพ์เล็ก 32 ตัว",
  )
  .transform((s) => (s === "" ? null : s));

function isNumeric(s: string): boolean {
  return NUMERIC_RE.test(s) && Number.isFinite(Number(s));
}

const requiredNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `กรุณากรอก ${label}`)
    .refine(isNumeric, `${label} ต้องเป็นตัวเลข`)
    .transform(Number);

const optionalNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine((s) => s === "" || isNumeric(s), `${label} ต้องเป็นตัวเลข หรือเว้นว่าง`)
    .transform((s) => (s === "" ? null : Number(s)));

/**
 * Schema เดียวกันใช้ทั้งฝั่ง client (ก่อนเปิด dialog ยืนยัน) และฝั่ง server (ใน Server Action)
 * input เป็น string ทั้งหมดตามที่มาจากฟอร์ม
 */
export const alarmFormSchema = z
  .object({
    event_time: z
      .string()
      .trim()
      .min(1, "กรุณาระบุเวลา")
      .regex(TIME_RE, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
    sub: z
      .string()
      .trim()
      .min(1, "กรุณากรอกสถานี")
      .max(50, "ชื่อสถานียาวเกิน 50 ตัวอักษร"),
    point: z
      .string()
      .trim()
      .min(1, "กรุณากรอกชื่อ Point")
      .max(200, "ชื่อ Point ยาวเกิน 200 ตัวอักษร"),
    point_type: z.enum(POINT_TYPES, { error: "เลือก Type เป็น ST, DI หรือ AI" }),
    value: requiredNumber("Value"),
    low_th: optionalNumber("Low threshold"),
    high_th: optionalNumber("High threshold"),
    notify_email: optionalEmail,
    notify_line_user_id: optionalLineUserId,
    consent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if ((v.notify_email !== null || v.notify_line_user_id !== null) && !v.consent) {
      ctx.addIssue({
        code: "custom",
        path: ["consent"],
        message: "กรุณาติ๊กยินยอมก่อนส่ง เมื่อกรอกอีเมลหรือ LINE User ID",
      });
    }
    if (v.low_th !== null && v.high_th !== null && !(v.low_th < v.high_th)) {
      ctx.addIssue({
        code: "custom",
        path: ["high_th"],
        message: "High threshold ต้องมากกว่า Low threshold",
      });
    }
  });

export type AlarmFormInput = z.input<typeof alarmFormSchema>;
export type AlarmFormOutput = z.output<typeof alarmFormSchema>;
export type AlarmFormField = keyof AlarmFormInput;
export type FieldErrors = Partial<Record<AlarmFormField, string>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key as AlarmFormField] = issue.message;
    }
  }
  return out;
}

export const uuidSchema = z.uuid();
