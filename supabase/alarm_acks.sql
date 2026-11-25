-- ตาราง Acknowledge alarm (ใช้ร่วมกันทุกคน: คนหนึ่ง ack แล้วหายไฮไลต์สำหรับทุกคน)
-- รันครั้งเดียวใน Supabase → SQL Editor
-- - ไม่แก้ตาราง scada_events เดิม แค่อ้างอิง id (ลบ alarm แล้ว ack ถูกลบตามอัตโนมัติ)
-- - แอปอ่าน/เขียนผ่าน service role เท่านั้น (เปิด RLS และไม่มี policy = anon/ผู้ใช้ทั่วไปเข้าถึงตรงไม่ได้)

create table if not exists public.alarm_acks (
  event_id        uuid primary key references public.scada_events (id) on delete cascade,
  acked_at        timestamptz not null default now(),
  acked_by        uuid references auth.users (id) on delete set null,
  acked_by_email  text
);

alter table public.alarm_acks enable row level security;

-- alarm ที่มีอยู่ก่อนเปิดใช้ฟีเจอร์นี้ ถือว่า ack แล้ว (ไม่งั้นทุกแถวเดิมจะถูกไฮไลต์)
insert into public.alarm_acks (event_id, acked_by_email)
select id, 'system (ก่อนเปิดใช้ acknowledge)' from public.scada_events
on conflict (event_id) do nothing;
