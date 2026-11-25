import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ShieldAlert } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/StatePanels";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { isMockMode } from "@/lib/supabase-server";
import { SUBMISSION_LIMIT, SubmissionsError, countByEmail, getRecentSubmissions } from "@/lib/submissions";
import { VISIT_LIMIT, VisitsError, getRecentVisits, shortUserAgent, summarize } from "@/lib/visits";

export const metadata: Metadata = { title: "ประวัติการเข้าชม" };

export default function VisitsPage({ searchParams }: PageProps<"/admin/visits">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="glass h-80 rounded-xl motion-safe:animate-pulse" aria-busy="true" aria-label="กำลังโหลด" />}>
        <VisitsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const TH = "px-3 py-2 text-left text-[11px] font-medium tracking-wide text-slate-600 uppercase";
const TD = "px-3 py-2 align-top border-b border-slate-900/[0.05]";

async function VisitsContent({ searchParams }: { searchParams: PageProps<"/admin/visits">["searchParams"] }) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/visits");

  // เฉพาะ ADMIN — ตรวจฝั่ง server ก่อนดึงข้อมูลเสมอ
  if (user.role !== "ADMIN") {
    return (
      <section className="glass mx-auto mt-8 max-w-md rounded-xl px-5 py-6 text-center">
        <ShieldAlert aria-hidden className="mx-auto h-7 w-7 text-slate-500" strokeWidth={1.5} />
        <h1 className="mt-3 text-base font-semibold text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="mt-1.5 text-sm text-slate-600">หน้าประวัติการเข้าชมดูได้เฉพาะผู้ใช้สิทธิ์ ADMIN เท่านั้น</p>
        <Link href="/" className="mt-4 inline-block rounded-md px-3 py-1.5 text-sm font-medium text-steel-700 hover:bg-white">
          กลับไปหน้า Dashboard
        </Link>
      </section>
    );
  }

  if (isMockMode()) {
    return <ErrorState title="ใช้ไม่ได้ในโหมดข้อมูลจำลอง" message="โหมด USE_MOCK_DATA ไม่เชื่อมต่อ Supabase จึงไม่มีประวัติการเข้าชม" />;
  }

  const sp = await searchParams;
  const emailParam = Array.isArray(sp.email) ? sp.email[0] : sp.email;
  const emailFilter = emailParam?.trim() || null;

  const [visitsRes, subsRes] = await Promise.allSettled([getRecentVisits(emailFilter), getRecentSubmissions(emailFilter)]);
  if (visitsRes.status === "rejected") {
    const err = visitsRes.reason;
    const message = err instanceof VisitsError ? err.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด";
    if (!(err instanceof VisitsError)) console.error("[admin/visits]", err);
    return <ErrorState title="โหลดประวัติการเข้าชมไม่สำเร็จ" message={message} />;
  }
  const rows = visitsRes.value;
  // ประวัติการส่งข้อมูลโหลดไม่ได้ (เช่น ยังไม่ได้สร้างตาราง) → ยังแสดงประวัติการเข้าชมได้ตามปกติ
  const submissions = subsRes.status === "fulfilled" ? subsRes.value : [];
  const subsError =
    subsRes.status === "rejected"
      ? subsRes.reason instanceof SubmissionsError
        ? subsRes.reason.message
        : "โหลดประวัติการส่งข้อมูลไม่สำเร็จ"
      : null;
  if (subsRes.status === "rejected" && !(subsRes.reason instanceof SubmissionsError)) console.error("[admin/visits]", subsRes.reason);
  const subCounts = countByEmail(submissions);
  const summary = summarize(rows);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">ประวัติการเข้าชม</h1>
        <p className="text-xs text-slate-600">
          {rows.length.toLocaleString()} รายการล่าสุด{rows.length >= VISIT_LIMIT && ` (แสดงสูงสุด ${VISIT_LIMIT.toLocaleString()})`} ·{" "}
          {summary.length} ผู้ใช้ · ส่งข้อมูล {submissions.length.toLocaleString()} ครั้ง
          {submissions.length >= SUBMISSION_LIMIT && ` (นับสูงสุด ${SUBMISSION_LIMIT.toLocaleString()})`}
        </p>
      </div>

      {subsError && (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset">
          {subsError}
        </p>
      )}

      {emailFilter && (
        <p className="text-sm text-slate-700">
          กรองเฉพาะ <span className="font-mono">{emailFilter}</span> ·{" "}
          <Link href="/admin/visits" className="font-medium text-steel-700 hover:underline">
            ดูทั้งหมด
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <section className="glass rounded-xl">
          <EmptyState title="ยังไม่มีประวัติการเข้าชม" />
        </section>
      ) : (
        <>
          {!emailFilter && (
            <section aria-labelledby="sum-title" className="glass overflow-x-auto rounded-xl">
              <h2 id="sum-title" className="border-b border-slate-900/[0.06] px-4 py-3 text-sm font-semibold text-slate-900">
                สรุปตามผู้ใช้
              </h2>
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-slate-900/[0.08]">
                    <th scope="col" className={`${TH} pl-4`}>อีเมล</th>
                    <th scope="col" className={`${TH} text-right`}>เข้าชม (ครั้ง)</th>
                    <th scope="col" className={`${TH} text-right`}>ส่งข้อมูล (ครั้ง)</th>
                    <th scope="col" className={TH}>เข้าครั้งแรก</th>
                    <th scope="col" className={`${TH} pr-4`}>เข้าล่าสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.email} className="hover:bg-white/80">
                      <td className={`${TD} pl-4 font-mono text-[13px]`}>
                        <Link href={`/admin/visits?email=${encodeURIComponent(s.email)}`} className="text-steel-700 hover:underline">
                          {s.email}
                        </Link>
                      </td>
                      <td className={`${TD} text-right tnum`}>{s.visits.toLocaleString()}</td>
                      <td className={`${TD} text-right tnum`}>{(subCounts.get(s.email) ?? 0).toLocaleString()}</td>
                      <td className={`${TD} text-slate-700 tnum`}>{formatDateTime(s.firstVisit)}</td>
                      <td className={`${TD} pr-4 text-slate-700 tnum`}>{formatDateTime(s.lastVisit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {submissions.length > 0 && (
            <section aria-labelledby="sub-title" className="glass overflow-x-auto rounded-xl">
              <h2 id="sub-title" className="border-b border-slate-900/[0.06] px-4 py-3 text-sm font-semibold text-slate-900">
                รายการส่งข้อมูล (เพิ่ม alarm จากหน้าทดสอบ)
              </h2>
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-slate-900/[0.08]">
                    <th scope="col" className={`${TH} pl-4`}>เวลา</th>
                    <th scope="col" className={TH}>อีเมล</th>
                    <th scope="col" className={TH}>สถานี</th>
                    <th scope="col" className={TH}>Point</th>
                    <th scope="col" className={`${TH} pr-4`}>ประเภท</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/80">
                      <td className={`${TD} pl-4 whitespace-nowrap text-slate-700 tnum`}>{formatDateTime(s.submitted_at)}</td>
                      <td className={`${TD} font-mono text-[13px]`}>{s.email ?? "—"}</td>
                      <td className={TD}>{s.sub ?? "—"}</td>
                      <td className={`${TD} font-mono text-[13px]`}>{s.point ?? "—"}</td>
                      <td className={`${TD} pr-4`}>{s.point_type ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section aria-labelledby="log-title" className="glass overflow-x-auto rounded-xl">
            <h2 id="log-title" className="border-b border-slate-900/[0.06] px-4 py-3 text-sm font-semibold text-slate-900">
              รายการเข้าชม
            </h2>
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="[&>th]:border-b [&>th]:border-slate-900/[0.08]">
                  <th scope="col" className={`${TH} pl-4`}>เวลา</th>
                  <th scope="col" className={TH}>อีเมล</th>
                  <th scope="col" className={TH}>หน้า</th>
                  <th scope="col" className={TH}>IP</th>
                  <th scope="col" className={`${TH} pr-4`}>เบราว์เซอร์</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/80">
                    <td className={`${TD} pl-4 whitespace-nowrap text-slate-700 tnum`}>{formatDateTime(r.visited_at)}</td>
                    <td className={`${TD} font-mono text-[13px]`}>{r.email ?? "—"}</td>
                    <td className={`${TD} font-mono text-[13px]`}>{r.path}</td>
                    <td className={`${TD} font-mono text-[13px] text-slate-700`}>{r.ip ?? "—"}</td>
                    <td className={`${TD} pr-4 whitespace-nowrap text-slate-700`} title={r.user_agent ?? undefined}>
                      {shortUserAgent(r.user_agent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
