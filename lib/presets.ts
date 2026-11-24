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

/** ชุดข้อมูลทดสอบ 30 รายการ — 11 รายการแรกเป็นชุดต้นฉบับ (ใช้ตามตัวอักษร ห้ามแก้), รายการที่ 12–30 เป็นเคสเพิ่มเติม */
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
  // ---- เคสเพิ่มเติม (12–30) ----
  { event_time: "11:05", sub: "DC2", point: "TR1 BUCHHOLZ ALARM", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "11:06", sub: "DC2", point: "TR1 WINDING TEMPERATURE", point_type: "AI", value: "98", low_th: "", high_th: "90" },
  { event_time: "11:10", sub: "DC2", point: "TR1 OIL LEVEL LOW", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "11:15", sub: "DC2", point: "TR1 HV CB OPEN", point_type: "ST", value: "1", low_th: "", high_th: "" },
  { event_time: "11:18", sub: "DC2", point: "115KV BUS FREQUENCY", point_type: "AI", value: "49.6", low_th: "49.8", high_th: "50.2" },
  { event_time: "11:30", sub: "SB3", point: "22KV FEEDER 3 OVERCURRENT RELAY OPERATED", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "11:30", sub: "SB3", point: "22KV FEEDER 3 CB OPEN", point_type: "ST", value: "1", low_th: "", high_th: "" },
  { event_time: "11:32", sub: "SB3", point: "22KV FEEDER 3 CURRENT", point_type: "AI", value: "0", low_th: "", high_th: "600" },
  { event_time: "11:45", sub: "SB3", point: "22KV FEEDER 3 CB CLOSE", point_type: "ST", value: "0", low_th: "", high_th: "" },
  { event_time: "12:05", sub: "DC1", point: "DC 110V BATTERY VOLTAGE", point_type: "AI", value: "101", low_th: "105", high_th: "125" },
  { event_time: "12:08", sub: "DC1", point: "DC EARTH FAULT", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "12:20", sub: "SB3", point: "FIRE ALARM CONTROL ROOM", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "12:35", sub: "SB3", point: "DOOR INTRUSION ALARM", point_type: "DI", value: "0", low_th: "", high_th: "" },
  { event_time: "13:10", sub: "DC2", point: "TR2 TAP POSITION", point_type: "AI", value: "9", low_th: "1", high_th: "17" },
  { event_time: "13:40", sub: "DC1", point: "LINE NO.2 POWER FACTOR", point_type: "AI", value: "0.82", low_th: "0.85", high_th: "1" },
  { event_time: "14:00", sub: "DC1", point: "LINE NO.2 ACTIVE POWER", point_type: "AI", value: "85", low_th: "", high_th: "120" },
  { event_time: "14:15", sub: "DC2", point: "RTU COMMUNICATION FAIL", point_type: "DI", value: "1", low_th: "", high_th: "" },
  { event_time: "14:30", sub: "DC1", point: "GIS03 DISCONNECTOR OPEN", point_type: "ST", value: "1", low_th: "", high_th: "" },
  { event_time: "15:00", sub: "DC1", point: "LINE NO.1 AUTO RECLOSE LOCKOUT", point_type: "DI", value: "1", low_th: "", high_th: "" },
];
