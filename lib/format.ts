import type { AlarmRow } from "./types";

export const APP_TIME_ZONE = "Asia/Bangkok";

/** "09:20:00" → "09:20" */
export function formatEventTime(t: string): string {
  return t.slice(0, 5);
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 ไม่มี DST
const DAY_MS = 24 * 60 * 60 * 1000;

const eventDateFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC", // คำนวณเป็นวันที่เวลาไทยแล้ว จึงจัดรูปแบบตาม UTC
  day: "numeric",
  month: "short",
  year: "2-digit",
});

/**
 * วันที่เกิด alarm เช่น "25 พ.ย. 69"
 * event_time เก็บแค่เวลา จึงใช้วันที่ของ received_at (เวลาไทย) แทน
 * กรณีข้ามเที่ยงคืน (เช่น เกิด 23:59 แต่ได้รับ 00:01) เวลาเกิดจะมากกว่าเวลาที่ได้รับเกิน 12 ชม. → ถอยไป 1 วัน
 */
export function formatEventDate(row: Pick<AlarmRow, "event_time" | "received_at">): string {
  const received = new Date(row.received_at).getTime();
  if (Number.isNaN(received)) return "";
  const local = received + BANGKOK_OFFSET_MS;
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
  const [h, m] = row.event_time.split(":").map(Number);
  let date = dayStart;
  if (Number.isFinite(h) && Number.isFinite(m)) {
    const eventMs = (h * 60 + m) * 60 * 1000;
    if (eventMs - (local - dayStart) > 12 * 60 * 60 * 1000) date -= DAY_MS;
  }
  return eventDateFmt.format(new Date(date));
}

const dateTimeFmt =new Intl.DateTimeFormat("th-TH", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const clockFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : clockFmt.format(d);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

export function formatNumber(n: number | null): string {
  return n === null ? "—" : numberFmt.format(n);
}

/** ระยะเวลาที่ใช้วิเคราะห์ (analyzed_at - received_at) */
export function formatDuration(fromIso: string, toIso: string | null): string {
  if (!toIso) return "—";
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)} วินาที`;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  if (min < 60) return `${min} นาที ${sec.toString().padStart(2, "0")} วินาที`;
  const hr = Math.floor(min / 60);
  return `${hr} ชม. ${(min % 60).toString().padStart(2, "0")} นาที`;
}

export type ThresholdState = "HIGH" | "LOW" | null;

/** เทียบค่ากับ threshold จากข้อมูลดิบ (ไม่ได้มาจาก AI) */
export function thresholdState(
  row: Pick<AlarmRow, "value" | "low_th" | "high_th">,
): ThresholdState {
  if (row.high_th !== null && row.value > row.high_th) return "HIGH";
  if (row.low_th !== null && row.value < row.low_th) return "LOW";
  return null;
}

/** แยก recommended_action เป็นรายการ และตัดเลขข้อ/bullet ที่จะซ้ำกับ <ol> */
export function splitActions(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    // ตัดเลขข้อทั้ง "3. xxx" และ "3.xxx" (ไม่มีเว้นวรรค) แต่ไม่ตัดตัวเลขทศนิยมเช่น "3.5 kV"
    .map((l) => l.trim().replace(/^(?:\d+[.)](?!\d)|[-•*])\s*/, ""))
    .filter((l) => l.length > 0);
}
