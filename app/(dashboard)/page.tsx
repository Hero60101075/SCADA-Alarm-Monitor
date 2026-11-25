import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AlarmList } from "@/components/AlarmList";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Filters } from "@/components/Filters";
import { EmptyState, ErrorState, MockBadge } from "@/components/StatePanels";
import { SummaryBar } from "@/components/SummaryBar";
import { getCurrentUser } from "@/lib/auth";
import { DataError, LIST_LIMIT, getRecentAlarms, getStations, getTodaySummary, parseFilters } from "@/lib/alarms";
import { ConfigError, isMockMode } from "@/lib/supabase-server";
import type { AlarmFilters, AlarmRow, TodaySummary } from "@/lib/types";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type LoadResult = { fetchedAt: string } & (
  | { ok: true; summary: TodaySummary; rows: AlarmRow[]; stations: string[] }
  | { ok: false; message: string; isConfig: boolean }
);

/** ดึงข้อมูลทั้งหมดของหน้า (นอก component เพื่อให้เรียก Date.now() ได้) */
async function load(filters: AlarmFilters): Promise<LoadResult> {
  await connection();
  const nowMs = Date.now();
  const fetchedAt = new Date(nowMs).toISOString();
  try {
    const [summary, rows, stations] = await Promise.all([
      getTodaySummary(nowMs),
      getRecentAlarms(filters),
      getStations(),
    ]);
    return { fetchedAt, ok: true, summary, rows, stations };
  } catch (err) {
    if (err instanceof ConfigError) return { fetchedAt, ok: false, message: err.message, isConfig: true };
    if (err instanceof DataError) return { fetchedAt, ok: false, message: err.userMessage, isConfig: false };
    console.error("[dashboard]", err);
    return { fetchedAt, ok: false, message: "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างโหลดข้อมูล", isConfig: false };
  }
}

async function DashboardContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  if (!(await getCurrentUser())) redirect("/login");
  const filters = parseFilters(await searchParams);
  const result = await load(filters);
  const { fetchedAt } = result;
  const mock = isMockMode();
  const filtered = filters.severities.length > 0 || filters.sub !== null || filters.q !== null;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Dashboard</h1>
          {mock && <MockBadge />}
        </div>
        <AutoRefresh fetchedAt={fetchedAt} />
      </div>

      {!result.ok ? (
        <ErrorState title="โหลดข้อมูลไม่สำเร็จ" message={result.message}>
          <p className="text-red-800">
            {result.isConfig
              ? "ตรวจสอบไฟล์ .env.local แล้วรีสตาร์ตเซิร์ฟเวอร์"
              : "ระบบจะลองใหม่อัตโนมัติทุก 10 วินาที หากยังไม่หายให้ตรวจสอบการเชื่อมต่อ Supabase"}
          </p>
        </ErrorState>
      ) : (
        <>
          <SummaryBar summary={result.summary} nowIso={fetchedAt} />

          <section aria-labelledby="list-title" className="glass overflow-hidden rounded-xl">
            <div className="space-y-3 border-b border-slate-900/[0.06] px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="list-title" className="text-sm font-semibold text-slate-900">
                  Alarm ล่าสุด
                </h2>
                <p className="text-xs text-slate-600 tnum">
                  แสดง {result.rows.length} รายการ{result.rows.length >= LIST_LIMIT ? ` (สูงสุด ${LIST_LIMIT})` : ""}
                </p>
              </div>
              <Filters value={filters} stations={result.stations} />
            </div>

            {result.rows.length === 0 ? (
              filtered ? (
                <EmptyState title="ไม่พบ alarm ที่ตรงกับตัวกรอง">ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</EmptyState>
              ) : (
                <EmptyState title="ยังไม่มี alarm ในระบบ">
                  เมื่อมี alarm ใหม่เข้ามา รายการจะแสดงที่นี่โดยอัตโนมัติ
                </EmptyState>
              )
            ) : (
              <AlarmList rows={result.rows} />
            )}
          </section>
        </>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดข้อมูล" className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <div className="h-4 w-48 rounded bg-slate-200/80 motion-safe:animate-pulse" />
      </div>
      <div className="glass h-[92px] rounded-xl" />
      <div className="glass space-y-3 rounded-xl p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-5 rounded bg-slate-200/70 motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
