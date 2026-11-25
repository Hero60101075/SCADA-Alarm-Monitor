-- ตารางบันทึกการเข้าชมเว็บ (Login with Google) — รันครั้งเดียวใน Supabase → SQL Editor
-- แอปเขียนผ่าน service role เท่านั้น (เปิด RLS และไม่มี policy = anon/ผู้ใช้ทั่วไปอ่าน/เขียนไม่ได้)

create table if not exists public.visit_logs (
  id          bigint generated always as identity primary key,
  visited_at  timestamptz not null default now(),
  user_id     uuid references auth.users (id) on delete set null,
  email       text,
  path        text not null,
  ip          text,
  user_agent  text
);

create index if not exists visit_logs_visited_at_idx on public.visit_logs (visited_at desc);
create index if not exists visit_logs_user_id_idx on public.visit_logs (user_id);

alter table public.visit_logs enable row level security;

-- ตัวอย่าง query ดูผู้เข้าชม
-- select email, count(*) as visits, max(visited_at) as last_visit
--   from public.visit_logs group by email order by last_visit desc;
