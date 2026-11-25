# Alarm Monitor

เว็บแอปสำหรับห้องควบคุม ใช้ดู alarm จากระบบควบคุมสถานี และผลวิเคราะห์ที่ Make + AI บันทึกกลับมาใน Supabase
พร้อมหน้าทดสอบสำหรับเพิ่ม alarm ใหม่

- `/` Dashboard: สรุปจำนวน alarm วันนี้, รายการล่าสุด 50 รายการ, ตัวกรอง, อัปเดตอัตโนมัติทุก 10 วินาที
- `/test` ทดสอบเพิ่ม alarm (ต้องใส่รหัสผ่าน): ฟอร์ม + preset, dialog ยืนยัน, ติดตามผลแบบ live, ลบรายการทดสอบ

> **ข้อมูลจำลอง:** ข้อมูล alarm และผลวิเคราะห์ที่แสดงในเว็บไซต์นี้เป็นข้อมูลจำลองเพื่อการทดสอบและสาธิตเท่านั้น
> ไม่ใช่ข้อมูลจริงจากสถานีไฟฟ้า ทุกหน้ามีแถบแจ้งผู้ใช้เรื่องนี้ (`components/DemoNotice.tsx`)

> **ทุกหน้าต้อง Login with Google** (Supabase Auth) — Google account ใดก็เข้าได้ และทุกการเข้าหน้าถูกบันทึกใน `visit_logs`
> หน้า `/test` ยังต้องใส่รหัสผ่านเพิ่มอีกชั้น

## สิ่งที่ต้องมี

- Node.js 20.9 ขึ้นไป (ทดสอบกับ Node 24)
- โปรเจกต์ Supabase ที่มีตาราง `scada_events`, `alarm_analyses` และ view `alarm_view` อยู่แล้ว
  (แอปนี้ไม่แก้ schema และไม่มี migration)

## ติดตั้ง

```bash
npm install
```

## ตั้งค่า `.env.local`

```bash
cp .env.local.example .env.local
```

แล้วแก้ค่าใน `.env.local`:

| ตัวแปร | คำอธิบาย |
|---|---|
| `SUPABASE_URL` | URL ของโปรเจกต์ เช่น `https://xxxx.supabase.co` (ไม่ต้องมี `/rest/v1`) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key แบบใหม่ (`sb_secret_...`) หรือ legacy JWT ที่ role = `service_role` |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key (`sb_publishable_...`) หรือ anon JWT ใช้สำหรับ Login with Google |
| `ADMIN_EMAILS` | อีเมลที่ได้สิทธิ์ ADMIN คั่นด้วย comma (ดูหน้า `/admin/visits` ได้) คนอื่นเป็น USER |
| `TEST_PAGE_PASSWORD` | รหัสผ่านเข้าหน้า `/test` (แนะนำยาว 12 ตัวอักษรขึ้นไป) |
| `USE_MOCK_DATA` | `true` = ใช้ข้อมูลจำลอง ไม่เชื่อมต่อ Supabase เลย |
| `NEXT_PUBLIC_LINE_OA_QR_URL` | URL รูป QR แอดเพื่อน LINE OA (ค่าสาธารณะ แสดงในหน้า `/test`) |
| `NEXT_PUBLIC_LINE_OA_ADD_URL` | ลิงก์แอดเพื่อน LINE OA เช่น `https://lin.ee/...` (ค่าสาธารณะ) |

ตัวแปร `NEXT_PUBLIC_*` ถูกฝังลงใน JavaScript ฝั่งเบราว์เซอร์ตอน build จึงใช้ได้เฉพาะค่าที่เปิดเผยได้
(QR/ลิงก์แอดเพื่อน) และต้องรีสตาร์ต `npm run dev` หรือ build ใหม่หลังแก้ค่า

แอปตรวจรูปแบบ key ตอนเริ่มเชื่อมต่อ ถ้าใส่ publishable key (`sb_publishable_...`) หรือ anon JWT
จะแสดงข้อความบอกว่าต้องใช้ secret/service_role key (เพราะทุกตารางเปิด RLS และไม่มี policy)

`.env.local` ถูก ignore ใน `.gitignore` แล้ว (`.env*`) มีเพียง `.env.local.example` ที่ commit ได้

## ตั้งค่า Login with Google (ครั้งเดียว)

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID (Web application)
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Sign In / Providers → Google: เปิดใช้ แล้วใส่ Client ID / Client Secret จากข้อ 1
3. **Supabase** → Authentication → URL Configuration
   - Site URL: URL หลักของเว็บ เช่น `https://scada-alarm-monitor.vercel.app`
   - Redirect URLs: เพิ่ม `http://localhost:3000/auth/callback` และ `https://scada-alarm-monitor.vercel.app/auth/callback`
4. **Supabase** → SQL Editor: รัน `supabase/visit_logs.sql` (บันทึกการเข้าชม) และ `supabase/alarm_submissions.sql` (นับจำนวนครั้งที่ส่งข้อมูล)
5. ใส่ `SUPABASE_PUBLISHABLE_KEY` ใน `.env.local` และใน Vercel → Settings → Environment Variables แล้ว redeploy

การทำงาน
- `proxy.ts` refresh session และ redirect ผู้ที่ยังไม่ login ไป `/login` (หน้า / Server Action ยังตรวจซ้ำเองด้วย)
- `components/VisitLogger.tsx` บันทึกทุกครั้งที่เปลี่ยนหน้า (ไม่นับ auto refresh) → `visit_logs`: เวลา, user id, อีเมล, path, IP, user agent
- การกด "เพิ่ม alarm" ที่ส่งสำเร็จในหน้า `/test` ถูกบันทึก 1 แถวใน `alarm_submissions` (เวลา, อีเมล, event id, สถานี, point, ประเภท) → หน้า `/admin/visits` แสดงจำนวนครั้งที่ส่งต่อคน + รายการส่งข้อมูล
- สิทธิ์: อีเมลใน `ADMIN_EMAILS` = **ADMIN** ดูหน้า `/admin/visits` (สรุปตามผู้ใช้ + รายการเข้าชม 1,000 รายการล่าสุด) ได้
  คนอื่นทั้งหมด = **USER** เข้า `/admin/visits` จะเจอหน้า "ไม่มีสิทธิ์" (ตรวจฝั่ง server ก่อนดึงข้อมูล)
- รายชื่อผู้ที่เคย login ดูได้ที่ Supabase → Authentication → Users
- หน้า `/test` เติม Gmail ของบัญชีที่ login เป็นผู้รับแจ้งเตือนให้อัตโนมัติ (แก้หรือลบได้)
- โหมด `USE_MOCK_DATA=true` ข้ามการ login และไม่บันทึกการเข้าชม

## รัน

```bash
npm run dev       # โหมดพัฒนา http://localhost:3000
npm run build     # build สำหรับใช้งานจริง
npm run start     # รันตัวที่ build แล้ว
npm run lint
```

### ทดสอบ UI ด้วยข้อมูลจำลอง (แนะนำระหว่างพัฒนา)

ตั้ง `USE_MOCK_DATA=true` ใน `.env.local` แล้ว `npm run dev`

- ไม่มีการเชื่อมต่อ Supabase เลย จึงไม่ทำให้ Make / AI / Gmail / LINE ทำงาน
- หน้าเว็บจะมีป้าย "โหมดข้อมูลจำลอง" กำกับไว้ตลอด
- ข้อมูลเก็บใน memory ของ server (รีสตาร์ตแล้วกลับเป็นข้อมูลเริ่มต้น)
- ผล "วิเคราะห์" ในโหมดนี้เป็นกฎตายตัวใน `lib/mock-store.ts` ไม่ใช่ผลจาก AI จริง จะขึ้นภายใน 5–11 วินาทีหลังเพิ่ม
- หน้า `/test` ยังต้องใช้ `TEST_PAGE_PASSWORD`

### Auto test ระดับความรุนแรงของ AI (`npm run test:ai`)

ส่ง preset ทั้ง 30 ข้อไปให้ bigbotagent (model `gemini-3.5-flash-lite`) วิเคราะห์**โดยตรง** แล้วเทียบ severity กับค่า `expected` ใน `lib/presets.ts`
ไม่ผ่าน Supabase / Make จึงไม่ส่ง Gmail/LINE และไม่เสีย credit ของ Make (เสียเฉพาะค่าเรียก bigbotagent)

1. ใส่ `BIGBOT_API_URL` และ `BIGBOT_API_KEY` (และ `GEMINI_MODEL` ถ้าไม่ใช่ `gemini-3.5-flash-lite`) ใน `.env.local`
2. แทนที่ `scripts/ai-severity/prompt.txt` ด้วย prompt จริงจาก Make ใช้ตัวแปร `{{event_time}}` `{{sub}}` `{{point}}`
   `{{point_type}}` `{{value}}` `{{low_th}}` `{{high_th}}` (threshold ว่างส่งเป็น `null`)
3. รัน

```bash
npm run test:ai                    # ทุกเคส 1 รอบ
npm run test:ai -- --only 3,5,22   # เฉพาะบางเคส
npm run test:ai -- --runs 3        # ยิงซ้ำเคสละ 3 รอบ ดูว่าผลคงที่ไหม (ใช้ผลส่วนใหญ่)
npm run test:ai -- --no-fail       # ไม่คืน exit code 1 เมื่อมีเคสไม่ตรง
```

ผลละเอียด (caption, recommended_action, เวลาตอบ) บันทึกเป็น JSON ใน `scripts/ai-severity/results/` (ignore ใน git)

## ข้อควรระวัง

### Service role key

- key นี้ข้าม RLS ได้ทั้งหมด อ่าน/เขียน/ลบได้ทุกตาราง **ห้ามหลุดออกนอก server**
- ใช้ผ่าน `lib/supabase-server.ts` เท่านั้น ไฟล์นี้ `import "server-only"` ถ้ามี client component import เข้าไป build จะล้ม
- ห้ามตั้งชื่อตัวแปรขึ้นต้นด้วย `NEXT_PUBLIC_` (Next.js จะฝังค่าไปกับ JavaScript ฝั่งเบราว์เซอร์)
- ห้าม commit `.env.local` ห้ามแปะ key ในแชต/ตั๋วงาน ถ้าสงสัยว่าหลุดให้ rotate ที่ Supabase → Settings → API ทันที

### Credit ของ Make และค่า AI

- ทุกครั้งที่ INSERT เข้า `scada_events` Database Webhook จะเรียก Make → AI → บันทึกผล
  **เสีย credit ของ Make และ token ของ AI ทุกครั้ง** และถ้าผลเป็น CRITICAL จะ **ส่ง Gmail และ LINE ถึงผู้รับจริง**
- หน้า `/test` จึงมีรหัสผ่าน, dialog ยืนยันทุกครั้ง และล็อกปุ่มส่ง 10 วินาทีหลังส่ง
- อย่ารันสคริปต์หรือคำสั่งที่ insert ข้อมูลจริงเพื่อทดสอบ ให้ใช้ `USE_MOCK_DATA=true` แทน
- การลบไม่ทำให้ Make ทำงาน (webhook ตั้งไว้เฉพาะ INSERT) และ `alarm_analyses` ถูกลบตามด้วย cascade

### หน้า `/test`

- ล็อกอินด้วย `TEST_PAGE_PASSWORD` เทียบฝั่ง server แบบ constant-time
- สถานะเก็บใน cookie `httpOnly` + `SameSite=Strict` ที่ลงนามด้วย HMAC (ไม่มีรหัสผ่านอยู่ใน cookie) อายุ 8 ชั่วโมง
  เปลี่ยน `TEST_PAGE_PASSWORD` แล้ว session เดิมใช้ไม่ได้ทันที
- ทุก Server Action ของหน้านี้ตรวจ session ซ้ำเองทุกครั้ง
- "รายการที่ทดสอบล่าสุด" แสดงและลบได้ **เฉพาะ alarm ที่ส่งจากหน้านี้ในเบราว์เซอร์เดียวกัน**
  (เก็บ id ไว้ใน httpOnly cookie สูงสุด 10 รายการ) เพราะฐานข้อมูลไม่มีคอลัมน์บอกว่าแถวไหนเป็นข้อมูลทดสอบ
  และห้ามแก้ schema จึงใช้วิธีนี้กันการลบ alarm จริงโดยไม่ตั้งใจ ถ้าล้าง cookie รายการนี้จะว่าง
  (ข้อมูลในฐานข้อมูลยังอยู่ ลบได้จาก Supabase Dashboard)

### ผู้รับแจ้งเตือนสำหรับทดสอบ

- หน้า `/test` มีช่อง Gmail และ LINE User ID (ไม่บังคับ) บันทึกลง `scada_events.notify_email` / `notify_line_user_id`
  ถ้าเว้นว่างจะส่งไปยังผู้รับค่าเริ่มต้นของทีม
- ตรวจรูปแบบด้วย zod ทั้ง client และ server: LINE User ID ต้องตรง `^U[0-9a-f]{32}$`
  และอีเมลใช้ regex `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`
  (ถ้า check constraint ในฐานข้อมูลใช้รูปแบบอื่น ให้แก้ `EMAIL_RE` ใน `lib/validation.ts` ให้ตรงกัน)
- เมื่อกรอกช่องใดช่องหนึ่ง ต้องติ๊กยินยอมก่อนส่งทุกครั้ง (ค่ายินยอมไม่ถูกบันทึกลงฐานข้อมูล)
- ค่า 2 ช่องถูกจำไว้ใน `localStorage` ของเบราว์เซอร์ (กด "ล้างค่าที่จำไว้" เพื่อลบ)
- รายการที่ทดสอบล่าสุดแสดงผู้รับแบบปิดบังบางส่วน (เช่น `he***@gmail.com`, `U4af…3c2f`) โดยปิดบังตั้งแต่ฝั่ง server
- หน้า Dashboard ไม่ query และไม่แสดงคอลัมน์ผู้รับเลย (เลือกคอลัมน์ของ `alarm_view` แบบระบุชื่อเสมอ)

### ถ้าส่งแล้วไม่มีผลภายใน 2 นาที

1. Make → Scenario → History: มีการรันหรือไม่ มี error หรือไม่
2. Scenario เปิดอยู่ (ON) และ credit ยังไม่หมด
3. Supabase → Database → Webhooks: webhook ของ INSERT บน `scada_events` ยังเปิดอยู่
4. ดู response ของ webhook ในตาราง `net._http_response` (pg_net)

## โครงสร้าง

```
app/
  layout.tsx                 ฟอนต์ IBM Plex Sans Thai / Plex Mono, พื้นหลัง, header
  (dashboard)/page.tsx       Dashboard (Server Component + Suspense)
  test/page.tsx              หน้าทดสอบ (ตรวจ session ฝั่ง server)
  test/login/page.tsx        หน้าใส่รหัสผ่าน
  test/actions.ts            Server Actions: login/logout, เพิ่ม, ติดตามผล, ลบ
  login/page.tsx             หน้า Login with Google
  auth/actions.ts            Server Actions: เริ่ม Google OAuth / ออกจากระบบ
  auth/callback/route.ts     แลก code จาก Google เป็น session
  auth/visit.ts              บันทึกการเข้าชมลง visit_logs
  admin/visits/page.tsx      หน้าประวัติการเข้าชม (ADMIN เท่านั้น)
proxy.ts                     บังคับ login ทุกหน้า + refresh session
supabase/visit_logs.sql      SQL สร้างตาราง visit_logs
supabase/alarm_submissions.sql  SQL สร้างตาราง alarm_submissions (นับการส่งข้อมูล)
lib/submissions.ts           บันทึก/ดึงประวัติการส่งข้อมูล
components/
  SeverityBadge, AlarmTable, AlarmCard, AlarmDrawer, AlarmList,
  Filters, AutoRefresh, SummaryBar, AlarmForm, AnalysisTracker,
  RecentTests, RecipientFields, ConfirmDialog, LoginForm, ...
lib/
  supabase-server.ts         Supabase client (server-only, service role)
  alarms.ts                  query functions (สลับไป mock เมื่อ USE_MOCK_DATA=true)
  validation.ts              zod schema ใช้ร่วมกันทั้ง client และ server
  presets.ts                 ชุดข้อมูลทดสอบ 30 รายการ
  test-auth.ts               session ของหน้า /test
  auth.ts, auth-config.ts    Supabase Auth (ผู้ใช้ที่ login อยู่)
  mock-store.ts              ข้อมูลจำลอง
  mask.ts                    ปิดบังอีเมล / LINE User ID
  types.ts, format.ts
```

หมายเหตุทางเทคนิค

- ใช้ Next.js 16 ที่เปิด Cache Components: ส่วนที่อ่านข้อมูลอยู่ใน `<Suspense>` และดึงสดทุก request ไม่มีการ cache ข้อมูล alarm
- เวลา "วันนี้" ในแถบสรุปคิดตามเวลาประเทศไทย (`Asia/Bangkok`) จาก `received_at`
- เรียงรายการด้วย `received_at` เสมอ (id เป็น UUID เรียงลำดับไม่ได้)
- เครื่องหมาย ▲ เกิน High / ▼ ต่ำกว่า Low คำนวณจาก value และ threshold โดยตรง ไม่ได้มาจาก AI
