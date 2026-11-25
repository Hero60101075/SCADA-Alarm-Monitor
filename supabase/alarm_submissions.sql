-- ตารางบันทึกการส่งข้อมูล (เพิ่ม alarm) จากหน้า /test — รันครั้งเดียวใน Supabase → SQL Editor
-- 1 แถว = ส่งสำเร็จ 1 ครั้ง ใช้นับจำนวนครั้งที่แต่ละคนส่ง
-- แอปเขียน/อ่านผ่าน service role เท่านั้น (เปิด RLS และไม่มี policy = anon/ผู้ใช้ทั่วไปอ่าน/เขียนไม่ได้)
-- event_id ไม่ผูก foreign key กับ scada_events: ลบ alarm ทดสอบแล้วประวัติการส่งยังอยู่ (และไม่แตะ schema เดิม)

create table if not exists public.alarm_submissions (
  id            bigint generated always as identity primary key,
  submitted_at  timestamptz not null default now(),
  user_id       uuid references auth.users (id) on delete set null,
  email         text,
  event_id      uuid,
  sub           text,
  point         text,
  point_type    text
);

create index if not exists alarm_submissions_submitted_at_idx on public.alarm_submissions (submitted_at desc);
create index if not exists alarm_submissions_user_id_idx on public.alarm_submissions (user_id);

alter table public.alarm_submissions enable row level security;

-- ตัวอย่าง query นับจำนวนครั้งที่ส่งต่อคน
-- select email, count(*) as submissions, max(submitted_at) as last_submit
--   from public.alarm_submissions group by email order by submissions desc;
