/** ระดับความรุนแรงที่ AI ส่งกลับมา (ตรงกับ check constraint ใน alarm_analyses) */
export const SEVERITIES = ["CRITICAL", "WARNING", "INFO"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** ค่าที่ใช้ในตัวกรอง: severity จริง + "รอวิเคราะห์" (severity เป็น null) */
export const SEVERITY_FILTERS = [...SEVERITIES, "PENDING"] as const;
export type SeverityFilter = (typeof SEVERITY_FILTERS)[number];

export const POINT_TYPES = ["ST", "DI", "AI"] as const;
export type PointType = (typeof POINT_TYPES)[number];

/** แถวของ view public.alarm_view */
export interface AlarmRow {
  id: string;
  /** time without time zone เช่น "09:20:00" */
  event_time: string;
  sub: string;
  point: string;
  /** ST / DI / AI — เก็บเป็น text ในฐานข้อมูล จึงอาจมีค่าอื่นได้ */
  point_type: string;
  value: number;
  low_th: number | null;
  high_th: number | null;
  /** ALARM / OPEN / CLOSE / NORMAL / ABNORMAL — null ถ้ายังไม่วิเคราะห์ */
  caption: string | null;
  severity: Severity | null;
  /** หลายข้อ คั่นด้วย \n */
  recommended_action: string | null;
  ai_model: string | null;
  /** timestamptz (ISO) = scada_events.created_at */
  received_at: string;
  /** timestamptz (ISO) = alarm_analyses.created_at */
  analyzed_at: string | null;
}

export interface TodaySummary {
  critical: number;
  warning: number;
  info: number;
  pending: number;
  total: number;
}

export interface AlarmFilters {
  severities: SeverityFilter[];
  sub: string | null;
  q: string | null;
}

export interface NewScadaEvent {
  event_time: string;
  sub: string;
  point: string;
  point_type: PointType;
  value: number;
  low_th: number | null;
  high_th: number | null;
  /** ผู้รับแจ้งเตือนทดสอบ (null = ผู้รับค่าเริ่มต้นของทีม) — ห้ามแสดง/query ในหน้า Dashboard */
  notify_email: string | null;
  notify_line_user_id: string | null;
}

/** ผู้รับแจ้งเตือนที่ปิดบังบางส่วนแล้ว (ปิดบังฝั่ง server ค่าเต็มไม่ถูกส่งไปเบราว์เซอร์) */
export interface MaskedRecipients {
  email: string | null;
  line: string | null;
}

export interface RecentTestRow {
  alarm: AlarmRow;
  recipients: MaskedRecipients;
}
