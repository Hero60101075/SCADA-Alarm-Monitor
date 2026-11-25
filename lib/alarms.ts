import "server-only";
import { getSupabaseServer, isMockMode } from "./supabase-server";
import { mockAll, mockDelete, mockInsert, mockRecipients } from "./mock-store";
import { maskEmail, maskLineUserId } from "./mask";
import {
  SEVERITIES,
  SEVERITY_FILTERS,
  type AlarmFilters,
  type AlarmRow,
  type MaskedRecipients,
  type NewScadaEvent,
  type Severity,
  type SeverityFilter,
  type TodaySummary,
} from "./types";

/**
 * คอลัมน์ของ alarm_view ที่ใช้ — ระบุชัดเจนเสมอ (ห้ามใช้ "*")
 * notify_email / notify_line_user_id ไม่อยู่ในรายการนี้และห้าม query ในหน้า Dashboard
 */
const VIEW_COLUMNS =
  "id,event_time,sub,point,point_type,value,low_th,high_th,caption,severity,recommended_action,ai_model,received_at,analyzed_at";

export const LIST_LIMIT = 50;

/** ข้อผิดพลาดจากฐานข้อมูล — เก็บ message ไว้ใน log ฝั่ง server ไม่ส่งรายละเอียดภายในไปที่หน้าเว็บ */
export class DataError extends Error {
  constructor(
    public readonly userMessage: string,
    cause?: unknown,
  ) {
    super(userMessage, { cause });
    this.name = "DataError";
  }
}

/** ดึงรายละเอียดจาก PostgrestError ออกมาเป็น object ธรรมดา (ถ้า log ตรงๆ จะเห็นแค่ {}) */
function describe(err: unknown): unknown {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return { message: e.message, code: e.code, details: e.details, hint: e.hint };
  }
  return err;
}

function fail(userMessage: string, err: unknown): never {
  console.error(`[alarms] ${userMessage}`, describe(err));
  throw new DataError(userMessage, err);
}

/* ---------- normalize ---------- */

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toSeverity(v: unknown): Severity | null {
  return typeof v === "string" && (SEVERITIES as readonly string[]).includes(v) ? (v as Severity) : null;
}

function normalizeRow(r: Record<string, unknown>): AlarmRow {
  return {
    id: String(r.id),
    event_time: str(r.event_time) ?? "",
    sub: str(r.sub) ?? "",
    point: str(r.point) ?? "",
    point_type: str(r.point_type) ?? "",
    value: num(r.value) ?? 0,
    low_th: num(r.low_th),
    high_th: num(r.high_th),
    caption: str(r.caption),
    severity: toSeverity(r.severity),
    recommended_action: str(r.recommended_action),
    ai_model: str(r.ai_model),
    received_at: str(r.received_at) ?? "",
    analyzed_at: str(r.analyzed_at),
  };
}

/* ---------- filters (มาจาก URL search params) ---------- */

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseFilters(params: RawParams): AlarmFilters {
  const sevRaw = first(params.severity) ?? "";
  const severities = Array.from(
    new Set(
      sevRaw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is SeverityFilter => (SEVERITY_FILTERS as readonly string[]).includes(s)),
    ),
  );
  const sub = first(params.sub)?.trim().slice(0, 50) || null;
  const q = first(params.q)?.trim().slice(0, 100) || null;
  return { severities, sub, q };
}

function matchesFilters(r: AlarmRow, f: AlarmFilters): boolean {
  if (f.sub && r.sub !== f.sub) return false;
  if (f.q && !r.point.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.severities.length > 0) {
    const key: SeverityFilter = r.severity ?? "PENDING";
    if (!f.severities.includes(key)) return false;
  }
  return true;
}

/** escape wildcard ของ LIKE เพื่อให้ค้นหาตามตัวอักษร */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/* ---------- เวลา "วันนี้" ตามเวลาประเทศไทย (UTC+7 ไม่มี DST) ---------- */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export function startOfTodayBangkok(nowMs: number): Date {
  const local = new Date(nowMs + BANGKOK_OFFSET_MS);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(startLocal - BANGKOK_OFFSET_MS);
}

/* ---------- queries ---------- */

export async function getRecentAlarms(filters: AlarmFilters): Promise<AlarmRow[]> {
  if (isMockMode()) {
    return mockAll()
      .filter((r) => matchesFilters(r, filters))
      .slice(0, LIST_LIMIT);
  }

  const sb = getSupabaseServer();
  let query = sb
    .from("alarm_view")
    .select(VIEW_COLUMNS)
    .order("received_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filters.sub) query = query.eq("sub", filters.sub);
  if (filters.q) query = query.ilike("point", `%${escapeLike(filters.q)}%`);

  const real = filters.severities.filter((s): s is Severity => s !== "PENDING");
  const wantPending = filters.severities.includes("PENDING");
  if (real.length > 0 && wantPending) {
    query = query.or(`severity.in.(${real.join(",")}),severity.is.null`);
  } else if (real.length > 0) {
    query = query.in("severity", real);
  } else if (wantPending) {
    query = query.is("severity", null);
  }

  const { data, error } = await query;
  if (error) fail("โหลดรายการ alarm ไม่สำเร็จ", error);
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function getTodaySummary(nowMs: number): Promise<TodaySummary> {
  const since = startOfTodayBangkok(nowMs);

  if (isMockMode()) {
    const today = mockAll().filter((r) => new Date(r.received_at) >= since);
    return {
      critical: today.filter((r) => r.severity === "CRITICAL").length,
      warning: today.filter((r) => r.severity === "WARNING").length,
      info: today.filter((r) => r.severity === "INFO").length,
      pending: today.filter((r) => r.severity === null).length,
      total: today.length,
    };
  }

  const sb = getSupabaseServer();
  const sinceIso = since.toISOString();
  const base = () =>
    sb.from("alarm_view").select("id", { count: "exact", head: true }).gte("received_at", sinceIso);

  const [critical, warning, info, pending, total] = await Promise.all([
    base().eq("severity", "CRITICAL"),
    base().eq("severity", "WARNING"),
    base().eq("severity", "INFO"),
    base().is("severity", null),
    base(),
  ]);
  for (const r of [critical, warning, info, pending, total]) {
    // HEAD request ไม่มี body → error.message มักว่าง จึงแนบ HTTP status ไว้ช่วยหาสาเหตุ
    if (r.error) fail("โหลดสรุปจำนวน alarm วันนี้ไม่สำเร็จ", { ...describe(r.error) as object, status: r.status });
  }
  return {
    critical: critical.count ?? 0,
    warning: warning.count ?? 0,
    info: info.count ?? 0,
    pending: pending.count ?? 0,
    total: total.count ?? 0,
  };
}

/** รายชื่อสถานีสำหรับตัวกรอง (จาก alarm ล่าสุดไม่เกิน 1,000 แถว) */
export async function getStations(): Promise<string[]> {
  if (isMockMode()) {
    return Array.from(new Set(mockAll().map((r) => r.sub))).sort();
  }
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("scada_events")
    .select("sub")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) fail("โหลดรายชื่อสถานีไม่สำเร็จ", error);
  const subs = (data ?? []).map((r) => str((r as Record<string, unknown>).sub)).filter((s): s is string => !!s);
  return Array.from(new Set(subs)).sort((a, b) => a.localeCompare(b));
}

export async function getAlarmById(id: string): Promise<AlarmRow | null> {
  if (isMockMode()) return mockAll().find((r) => r.id === id) ?? null;
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("alarm_view").select(VIEW_COLUMNS).eq("id", id).maybeSingle();
  if (error) fail("โหลดสถานะ alarm ไม่สำเร็จ", error);
  return data ? normalizeRow(data as Record<string, unknown>) : null;
}

export async function getAlarmsByIds(ids: string[]): Promise<AlarmRow[]> {
  if (ids.length === 0) return [];
  if (isMockMode()) {
    const set = new Set(ids);
    return mockAll().filter((r) => set.has(r.id));
  }
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("alarm_view")
    .select(VIEW_COLUMNS)
    .in("id", ids)
    .order("received_at", { ascending: false });
  if (error) fail("โหลดรายการที่ทดสอบล่าสุดไม่สำเร็จ", error);
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

/**
 * ผู้รับแจ้งเตือนของรายการทดสอบ (ใช้เฉพาะหน้า /test)
 * ปิดบังบางส่วนตั้งแต่ฝั่ง server ค่าเต็มไม่ถูกส่งออกจากฟังก์ชันนี้
 */
export async function getTestRecipients(ids: string[]): Promise<Record<string, MaskedRecipients>> {
  if (ids.length === 0) return {};
  if (isMockMode()) return mockRecipients(ids);
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("scada_events").select("id,notify_email,notify_line_user_id").in("id", ids);
  if (error) fail("โหลดข้อมูลผู้รับแจ้งเตือนไม่สำเร็จ", error);
  const out: Record<string, MaskedRecipients> = {};
  for (const raw of data ?? []) {
    const r = raw as Record<string, unknown>;
    out[String(r.id)] = { email: maskEmail(str(r.notify_email)), line: maskLineUserId(str(r.notify_line_user_id)) };
  }
  return out;
}

/**
 * INSERT เข้า scada_events — จะทำให้ Database Webhook เรียก Make → AI
 * และถ้าเป็น CRITICAL จะส่ง Gmail/LINE จริง
 */
export async function insertScadaEvent(e: NewScadaEvent): Promise<string> {
  if (isMockMode()) return mockInsert(e);
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("scada_events").insert(e).select("id").single();
  if (error || !data) fail("บันทึก alarm ไม่สำเร็จ", error);
  return String((data as Record<string, unknown>).id);
}

/** DELETE จาก scada_events (alarm_analyses ถูกลบตามด้วย on delete cascade) */
export async function deleteScadaEvent(id: string): Promise<boolean> {
  if (isMockMode()) return mockDelete(id);
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("scada_events").delete().eq("id", id).select("id");
  if (error) fail("ลบ alarm ไม่สำเร็จ", error);
  return (data ?? []).length > 0;
}
