import type { PointType } from "./types";

/** ค่าในฟอร์มเป็น string ทั้งหมด (threshold ว่าง = "") */
export interface AlarmPreset {
  event_time: string;
  sub: string;
  point: string;
  point_type: PointType;
  value: string;
  low_th: string;
  high_th: string;
}

/** ชุดข้อมูลทดสอบ — ใช้ตามตัวอักษร ห้ามแก้ ห้ามเพิ่ม */
export const PRESETS: readonly AlarmPreset[] = [
  { event_time: "07:53", sub: "DC1", point: "GIS01CB CLOSE", point_type: "ST", value: "0", low_th: "", high_th: "" },
  { event_time: "07:55", sub: "DC1", point: "GIS01CB LOW GAS STAGE 1", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "09:12", sub: "DC1", point: "GIS01CB LOW GAS STAGE 2", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "09:20", sub: "DC1", point: "GIS01CB LOW GAS LOCKOUT OPERATED", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "09:20", sub: "DC1", point: "GIS01CB OPEN", point_type: "ST", value: "1", low_th: "", high_th: "" },
  { event_time: "09:25", sub: "DC1", point: "LCC1 AC MCB TRIP", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "10:40", sub: "DC1", point: "LINE NO.1 DISTANCE RELAY OPERATED", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "10:40", sub: "DC1", point: "LINE NO.1 DISTANCE RELAY AUX TRIP", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "10:40", sub: "DC1", point: "GIS02CB OPEN", point_type: "ST", value: "1", low_th: "", high_th: "" },
  { event_time: "10:40", sub: "DC1", point: "LINE NO.1 VOLTAGE A-C", point_type: "AI", value: "115000", low_th: "112000", high_th: "117000" },
  { event_time: "10:40", sub: "DC1", point: "LINE NO.1 CURRENT", point_type: "AI", value: "1000", low_th: "", high_th: "2000" },
];
