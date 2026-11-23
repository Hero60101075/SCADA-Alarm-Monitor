"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";
import { deleteAlarmAction } from "@/app/test/actions";
import { formatDateTime, formatEventTime } from "@/lib/format";
import type { AlarmRow, MaskedRecipients, RecentTestRow } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { SeverityBadge } from "./SeverityBadge";

/** รายการที่ทดสอบล่าสุด (สูงสุด 10) พร้อมปุ่มลบทีละแถว */
export function RecentTests({ rows }: { rows: RecentTestRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<AlarmRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    if (!target) return;
    const row = target;
    startTransition(async () => {
      const res = await deleteAlarmAction(row.id);
      setTarget(null);
      if (res.ok) {
        setError(null);
        setNotice(`ลบ ${row.point} แล้ว`);
        router.refresh();
      } else {
        setNotice(null);
        setError(res.error);
      }
    });
  };

  return (
    <section aria-labelledby="recent-title" className="glass overflow-hidden rounded-xl">
      <div className="flex flex-col gap-0.5 border-b border-slate-900/[0.06] px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 id="recent-title" className="text-sm font-semibold text-slate-900">
          รายการที่ทดสอบล่าสุด
        </h2>
        <p className="text-xs text-slate-600">เฉพาะที่ส่งจากเบราว์เซอร์นี้ · สูงสุด 10 รายการ</p>
      </div>

      <div aria-live="polite">
        {error && <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">{error}</p>}
        {notice && <p className="border-b border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700">{notice}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-600">ยังไม่มีรายการที่ทดสอบจากหน้านี้</p>
      ) : (
        <ul className="divide-y divide-slate-900/[0.06]">
          {rows.map(({ alarm: r, recipients }) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                  <span className="font-mono text-[13px] text-slate-800 tnum">{formatEventTime(r.event_time)}</span>
                  <span>{r.sub}</span>
                  <span className="font-mono">{r.point_type}</span>
                  <SeverityBadge severity={r.severity} analyzing />
                </div>
                <p className="mt-0.5 font-mono text-[13px] font-medium break-words text-slate-900">{r.point}</p>
                <p className="text-[11px] text-slate-600 tnum">รับเข้า {formatDateTime(r.received_at)}</p>
                <RecipientLine recipients={recipients} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setTarget(r);
                }}
                className="touch-target inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-800 transition-colors duration-150 hover:bg-red-50"
                aria-label={`ลบ ${r.point} (${formatEventTime(r.event_time)})`}
              >
                <Trash aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                ลบ
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={target !== null}
        title="ลบ alarm ทดสอบ"
        tone="danger"
        confirmLabel={isPending ? "กำลังลบ…" : "ลบถาวร"}
        pending={isPending}
        onCancel={() => setTarget(null)}
        onConfirm={onConfirm}
      >
        {target && (
          <div className="space-y-2">
            <p>
              ลบ <span className="font-mono font-medium text-slate-900">{target.point}</span> ({target.sub},{" "}
              <span className="font-mono tnum">{formatEventTime(target.event_time)}</span>) ออกจาก scada_events
            </p>
            <p className="text-slate-600">
              ผลวิเคราะห์ใน alarm_analyses จะถูกลบตามไปด้วย (cascade) — การลบไม่ทำให้ Make ทำงาน เพราะ webhook ตั้งไว้เฉพาะ INSERT
            </p>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}

/** แสดงผู้รับแบบปิดบังบางส่วน (ปิดบังมาจาก server แล้ว) */
function RecipientLine({ recipients }: { recipients: MaskedRecipients }) {
  if (!recipients.email && !recipients.line) {
    return <p className="text-[11px] text-slate-600">แจ้งเตือน: ผู้รับค่าเริ่มต้นของทีม</p>;
  }
  return (
    <p className="flex flex-wrap gap-x-3 text-[11px] text-slate-600">
      <span>แจ้งเตือน:</span>
      {recipients.email && (
        <span>
          Gmail <span className="font-mono text-slate-800">{recipients.email}</span>
        </span>
      )}
      {recipients.line && (
        <span>
          LINE <span className="font-mono text-slate-800">{recipients.line}</span>
        </span>
      )}
    </p>
  );
}
