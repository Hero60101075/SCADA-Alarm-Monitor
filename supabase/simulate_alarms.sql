-- จำลองข้อมูล alarm + ผลวิเคราะห์ AI โดยไม่ผ่าน Make (ไม่เสีย credit, ไม่ส่ง Gmail/LINE)
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์แล้วกด Run (รันซ้ำได้ ได้ชุดใหม่ทุกครั้ง)
--
-- ทำไมไม่เรียก Make:
--   Database Webhook คือ trigger บน scada_events ไฟล์นี้ปิด trigger ของ user ชั่วคราว "ภายใน transaction เดียว"
--   แล้วเปิดคืนก่อน commit → INSERT ชุดนี้ไม่ยิง webhook
--   ระหว่างรัน (ไม่ถึงวินาที) INSERT จริงจากที่อื่นจะ "รอ" ไม่ใช่ "หลุด" เพราะ ALTER TABLE ล็อกตารางไว้
--   ถ้ามี error กลางทาง transaction rollback ทั้งหมด trigger กลับเป็นเปิดตามเดิม
--
-- ข้อมูลจำลองแยกได้จาก ai_model = 'simulated' (แสดงในหน้ารายละเอียดด้วย) — ลบได้ด้วย SQL ท้ายไฟล์
-- แถวที่ severity เป็น null = จำลอง "รอวิเคราะห์" (ไม่มีผลใน alarm_analyses)

begin;

alter table public.scada_events disable trigger user;

with input (sub, point, point_type, value, low_th, high_th, minutes_ago, caption, severity, recommended_action) as (
  values
    ('DC2', 'TR1 BUCHHOLZ ALARM', 'DI', 1, null::numeric, null::numeric, 50, 'ALARM', 'CRITICAL',
     E'ตรวจสอบ Buchholz relay และระดับน้ำมันของ TR1 หน้างาน\nตรวจสอบก๊าซสะสมใน Buchholz relay และเก็บตัวอย่างไปวิเคราะห์ (DGA)\nแจ้ง Dispatch เพื่อพิจารณาลดโหลดหรือปลด TR1\nห้ามสั่ง Close/Reset ก่อนตรวจสอบหน้างานและได้รับอนุญาตจาก Dispatch'),
    ('DC2', 'TR1 WINDING TEMPERATURE', 'AI', 98, null, 90, 49, 'ABNORMAL', 'CRITICAL',
     E'ตรวจสอบโหลดของ TR1 เทียบกับพิกัด\nตรวจสอบการทำงานของพัดลมและปั๊มระบายความร้อน\nแจ้ง Dispatch เพื่อพิจารณาลดโหลด TR1'),
    ('DC1', 'GIS01CB LOW GAS STAGE 1', 'DI', 1, null, null, 35, 'ALARM', 'WARNING',
     E'ตรวจสอบค่าความดันก๊าซ SF6 ของ GIS01CB ที่ density monitor\nตรวจหาจุดรั่วด้วยเครื่องตรวจก๊าซ SF6\nเฝ้าระวังไม่ให้ลดลงถึง Stage 2'),
    ('DC1', 'DC EARTH FAULT', 'DI', 1, null, null, 28, 'ALARM', 'WARNING',
     E'ตรวจสอบค่าความต้านทานฉนวนของระบบ DC 110V\nไล่ตัดวงจร DC ทีละวงจรเพื่อหาจุด earth fault ตาม procedure\nประสานงานกับ Dispatch ก่อนตัดวงจรที่เกี่ยวกับระบบป้องกัน'),
    ('SB3', '22KV FEEDER 3 OVERCURRENT RELAY OPERATED', 'DI', 1, null, null, 20, 'ALARM', 'CRITICAL',
     E'ตรวจสอบ fault record และ event log ของ overcurrent relay Feeder 3\nแจ้ง Dispatch และทีม Line เพื่อตรวจสอบสายป้อน\nห้ามสั่ง Close/Reset ก่อนตรวจสอบหน้างานและได้รับอนุญาตจาก Dispatch'),
    ('SB3', '22KV FEEDER 3 CURRENT', 'AI', 0, null, 600, 19, 'NORMAL', 'INFO',
     E'ยืนยันว่ากระแสเป็น 0 สอดคล้องกับสถานะ CB Feeder 3 ที่เปิดอยู่'),
    ('DC2', 'TR2 TAP POSITION', 'AI', 9, 1, 17, 12, 'NORMAL', 'INFO',
     E'บันทึกค่า Tap position เพื่อติดตามแนวโน้ม'),
    ('DC1', 'LINE NO.2 POWER FACTOR', 'AI', 0.82, 0.85, 1, 6, 'ABNORMAL', 'WARNING',
     E'ตรวจสอบสถานะ capacitor bank ของสถานี\nแจ้ง Dispatch เพื่อพิจารณาปรับ reactive power'),
    -- จำลอง "รอวิเคราะห์" (ยังไม่มีผล AI)
    ('DC1', 'RTU COMMUNICATION FAIL', 'DI', 1, null, null, 1, null, null, null)
),
ev as (
  insert into public.scada_events (event_time, sub, point, point_type, value, low_th, high_th, created_at)
  select
    ((now() - make_interval(mins => minutes_ago)) at time zone 'Asia/Bangkok')::time(0),
    sub, point, point_type, value, low_th, high_th,
    now() - make_interval(mins => minutes_ago)
  from input
  returning id, sub, point, created_at
)
insert into public.alarm_analyses (alarm_id, caption, severity, recommended_action, ai_model, created_at)
select
  ev.id, i.caption, i.severity, i.recommended_action, 'simulated',
  ev.created_at + make_interval(secs => 2 + random() * 3)  -- จำลองเวลา AI วิเคราะห์ 2–5 วินาที
from ev
join input i on i.sub = ev.sub and i.point = ev.point
where i.severity is not null;

alter table public.scada_events enable trigger user;

commit;

-- ตรวจผล
-- select event_time, sub, point, severity, caption, ai_model from public.alarm_view
--   order by received_at desc limit 10;

-- ลบข้อมูลจำลองทั้งหมด (alarm_analyses / alarm_acks ถูกลบตามด้วย cascade, การลบไม่เรียก Make เพราะ webhook ตั้งไว้เฉพาะ INSERT)
-- หมายเหตุ: แถว "รอวิเคราะห์" ไม่มี ai_model จึงต้องลบด้วยชื่อ point แยก
-- delete from public.scada_events
--   where id in (select alarm_id from public.alarm_analyses where ai_model = 'simulated');
-- delete from public.scada_events
--   where point = 'RTU COMMUNICATION FAIL' and id not in (select alarm_id from public.alarm_analyses);
