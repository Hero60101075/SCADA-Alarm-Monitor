# SCADA Alarm Monitor

เว็บแอปสำหรับห้องควบคุม ใช้ดู alarm จาก SCADA และผลวิเคราะห์ที่ Make + AI บันทึกกลับมาใน Supabase
พร้อมหน้าทดสอบสำหรับเพิ่ม alarm ใหม่

- `/` Dashboard: สรุปจำนวน alarm วันนี้, รายการล่าสุด 50 รายการ, ตัวกรอง, อัปเดตอัตโนมัติทุก 10 วินาที
- `/test` ทดสอบเพิ่ม alarm (ต้องใส่รหัสผ่าน): ฟอร์ม + preset, dialog ยืนยัน, ติดตามผลแบบ live, ลบรายการทดสอบ

> **ใช้บน localhost หรือภายในองค์กรเท่านั้น** หน้า Dashboard ไม่มีระบบล็อกอิน
> ห้าม deploy ขึ้นอินเทอร์เน็ตสาธารณะจนกว่าจะเพิ่มระบบล็อกอินสำหรับ Dashboard ด้วย

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
| `TEST_PAGE_PASSWORD` | รหัสผ่านเข้าหน้า `/test` (แนะนำยาว 12 ตัวอักษรขึ้นไป) |
| `USE_MOCK_DATA` | `true` = ใช้ข้อมูลจำลอง ไม่เชื่อมต่อ Supabase เลย |
| `NEXT_PUBLIC_LINE_OA_QR_URL` | URL รูป QR แอดเพื่อน LINE OA (ค่าสาธารณะ แสดงในหน้า `/test`) |
| `NEXT_PUBLIC_LINE_OA_ADD_URL` | ลิงก์แอดเพื่อน LINE OA เช่น `https://lin.ee/...` (ค่าสาธารณะ) |

ตัวแปร `NEXT_PUBLIC_*` ถูกฝังลงใน JavaScript ฝั่งเบราว์เซอร์ตอน build จึงใช้ได้เฉพาะค่าที่เปิดเผยได้
(QR/ลิงก์แอดเพื่อน) และต้องรีสตาร์ต `npm run dev` หรือ build ใหม่หลังแก้ค่า

แอปตรวจรูปแบบ key ตอนเริ่มเชื่อมต่อ ถ้าใส่ publishable key (`sb_publishable_...`) หรือ anon JWT
จะแสดงข้อความบอกว่าต้องใช้ secret/service_role key (เพราะทุกตารางเปิด RLS และไม่มี policy)

`.env.local` ถูก ignore ใน `.gitignore` แล้ว (`.env*`) มีเพียง `.env.local.example` ที่ commit ได้

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
  และห้ามแก้ schema จึงใช้วิธีนี้กันการลบ alarm จริงจาก SCADA โดยไม่ตั้งใจ ถ้าล้าง cookie รายการนี้จะว่าง
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
components/
  SeverityBadge, AlarmTable, AlarmCard, AlarmDrawer, AlarmList,
  Filters, AutoRefresh, SummaryBar, AlarmForm, AnalysisTracker,
  RecentTests, RecipientFields, ConfirmDialog, LoginForm, ...
lib/
  supabase-server.ts         Supabase client (server-only, service role)
  alarms.ts                  query functions (สลับไป mock เมื่อ USE_MOCK_DATA=true)
  validation.ts              zod schema ใช้ร่วมกันทั้ง client และ server
  presets.ts                 ชุดข้อมูลทดสอบ 11 รายการ
  test-auth.ts               session ของหน้า /test
  mock-store.ts              ข้อมูลจำลอง
  mask.ts                    ปิดบังอีเมล / LINE User ID
  types.ts, format.ts
```

หมายเหตุทางเทคนิค

- ใช้ Next.js 16 ที่เปิด Cache Components: ส่วนที่อ่านข้อมูลอยู่ใน `<Suspense>` และดึงสดทุก request ไม่มีการ cache ข้อมูล alarm
- เวลา "วันนี้" ในแถบสรุปคิดตามเวลาประเทศไทย (`Asia/Bangkok`) จาก `received_at`
- เรียงรายการด้วย `received_at` เสมอ (id เป็น UUID เรียงลำดับไม่ได้)
- เครื่องหมาย ▲ เกิน High / ▼ ต่ำกว่า Low คำนวณจาก value และ threshold โดยตรง ไม่ได้มาจาก AI
# SCADA-Alarm-Monitor
