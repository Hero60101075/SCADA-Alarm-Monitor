import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LogOut, TriangleExclamationPoint } from "lucide-react";
import { AlarmForm } from "@/components/AlarmForm";
import { RecentTests } from "@/components/RecentTests";
import { ErrorState, MockBadge } from "@/components/StatePanels";
import { DataError, getAlarmsByIds, getTestRecipients } from "@/lib/alarms";
import { ConfigError, isMockMode } from "@/lib/supabase-server";
import { getTestedIds, isTestAuthenticated } from "@/lib/test-auth";
import type { RecentTestRow } from "@/lib/types";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "ทดสอบเพิ่ม alarm" };

export default function TestPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 xl:max-w-7xl">
      <div role="note" className="flex gap-3 rounded-xl border border-red-300 bg-red-50/95 px-4 py-3.5 text-sm text-red-950">
        <TriangleExclamationPoint aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
        <div className="space-y-1">
          <p className="font-semibold">การเพิ่ม alarm ที่หน้านี้ทำงานกับระบบจริง</p>
          <p>
            ทุกครั้งที่ส่ง ระบบจะเรียก Make → AI → บันทึกผลกลับ และถ้าผลเป็น CRITICAL จะส่ง Gmail และ LINE ถึงผู้รับจริง
          </p>
          <p>เสีย credit ของ Make และ token ของ AI ทุกครั้ง — ส่งเท่าที่จำเป็นเท่านั้น</p>
        </div>
      </div>

      <Suspense fallback={<TestSkeleton />}>
        <TestContent />
      </Suspense>
    </div>
  );
}

type RecentResult = { ok: true; rows: RecentTestRow[] } | { ok: false; message: string };

async function loadRecent(ids: string[]): Promise<RecentResult> {
  try {
    const [alarms, recipients] = await Promise.all([getAlarmsByIds(ids), getTestRecipients(ids)]);
    return {
      ok: true,
      rows: alarms.map((alarm) => ({ alarm, recipients: recipients[alarm.id] ?? { email: null, line: null } })),
    };
  } catch (err) {
    if (err instanceof ConfigError) return { ok: false, message: err.message };
    if (err instanceof DataError) return { ok: false, message: err.userMessage };
    console.error("[test]", err);
    return { ok: false, message: "โหลดรายการที่ทดสอบล่าสุดไม่สำเร็จ" };
  }
}

async function TestContent() {
  await connection();
  if (!(await isTestAuthenticated())) redirect("/test/login");

  const ids = await getTestedIds();
  const recent = await loadRecent(ids);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">ทดสอบเพิ่ม alarm</h1>
          {isMockMode() && <MockBadge />}
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-white"
          >
            <LogOut aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            ออกจากหน้าทดสอบ
          </button>
        </form>
      </div>

      <AlarmForm
        aside={
          recent.ok ? (
            <RecentTests rows={recent.rows} />
          ) : (
            <ErrorState title="โหลดรายการที่ทดสอบล่าสุดไม่สำเร็จ" message={recent.message} />
          )
        }
      />
    </>
  );
}

function TestSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด" className="space-y-4">
      <div className="h-7 w-48 rounded bg-slate-200/80 motion-safe:animate-pulse" />
      <div className="glass h-80 rounded-xl" />
    </div>
  );
}
