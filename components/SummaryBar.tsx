import { formatDate } from "@/lib/format";
import type { Severity, TodaySummary } from "@/lib/types";
import { SeverityDot } from "./SeverityBadge";

const ITEMS: { key: keyof Omit<TodaySummary, "total">; label: string; severity: Severity | null; tone: string }[] = [
  { key: "critical", label: "CRITICAL", severity: "CRITICAL", tone: "text-red-800" },
  { key: "warning", label: "WARNING", severity: "WARNING", tone: "text-amber-900" },
  { key: "info", label: "INFO", severity: "INFO", tone: "text-info-800" },
  { key: "pending", label: "รอวิเคราะห์", severity: null, tone: "text-slate-700" },
];

/** แถบสรุปจำนวน alarm วันนี้ (เวลาประเทศไทย) — แถบเดียวแบ่งช่อง ไม่ใช่การ์ดแยกกัน */
export function SummaryBar({ summary, nowIso }: { summary: TodaySummary; nowIso: string }) {
  return (
    <section aria-labelledby="summary-title" className="glass rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="flex items-baseline justify-between gap-3 border-b border-slate-900/[0.06] px-4 py-3 sm:block sm:w-52 sm:shrink-0 sm:border-r sm:border-b-0">
          <h2 id="summary-title" className="text-xs font-medium text-slate-600">
            Alarm วันนี้
          </h2>
          <p className="text-xs text-slate-600 sm:mt-0.5">{formatDate(nowIso)}</p>
          <p className="font-mono text-2xl leading-none font-medium text-slate-900 tnum sm:mt-2">
            {summary.total}
            <span className="ml-1.5 font-sans text-xs font-normal text-slate-600">รายการ</span>
          </p>
        </div>
        <dl className="grid flex-1 grid-cols-2 sm:grid-cols-4">
          {ITEMS.map((it, i) => {
            const n = summary[it.key];
            const emphasize = it.key === "critical" && n > 0;
            return (
              <div
                key={it.key}
                className={`flex flex-col justify-center gap-1 px-4 py-3 ${i % 2 === 1 ? "border-l" : ""} ${
                  i >= 2 ? "border-t sm:border-t-0" : ""
                } ${i >= 1 ? "sm:border-l" : ""} border-slate-900/[0.06] ${emphasize ? "bg-red-50/70" : ""}`}
              >
                <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-600">
                  <SeverityDot severity={it.severity} />
                  {it.label}
                </dt>
                <dd className={`font-mono text-xl leading-none font-medium tnum ${n > 0 ? it.tone : "text-slate-400"}`}>{n}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
