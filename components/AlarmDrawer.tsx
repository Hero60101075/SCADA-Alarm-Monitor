"use client";

import { useEffect, useRef } from "react";
import { BellCheck, TriangleExclamationPoint, X } from "lucide-react";
import type { AckInfo } from "@/lib/acks";
import { formatDateTime, formatDuration, formatEventDate, formatEventTime, splitActions } from "@/lib/format";
import type { AlarmRow } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { ValueCell } from "./ValueCell";

interface AlarmDrawerProps {
  row: AlarmRow | null;
  open: boolean;
  onClose: () => void;
  /** ข้อมูลการ ack จาก server (null = ยังไม่ ack หรือยังไม่เปิดใช้) */
  ack: AckInfo | null;
  unacked: boolean;
  onAck: () => void;
}

/** panel รายละเอียดด้านขวา ใช้ <dialog> แบบ modal เพื่อจัดการ focus/Esc ให้ถูกต้อง */
export function AlarmDrawer({ row, open, onClose, ack, unacked, onAck }: AlarmDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dlg.showModal();
      closeRef.current?.focus();
    } else if (!open && dlg.open) {
      dlg.close();
      returnFocusRef.current?.focus();
    }
  }, [open]);

  const actions = splitActions(row?.recommended_action ?? null);
  const analyzed = row?.severity != null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="alarm-drawer-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="glass-strong fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md overflow-hidden rounded-none p-0 text-slate-900 sm:rounded-l-xl"
    >
      {row && (
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-3 border-b border-slate-900/[0.07] px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600">
                สถานี <span className="font-medium text-slate-800">{row.sub}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                Type <span className="font-mono text-slate-800">{row.point_type}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                เวลา <span className="text-slate-800">{formatEventDate(row)}</span>{" "}
                <span className="font-mono text-slate-800 tnum">{formatEventTime(row.event_time)}</span>
              </p>
              <h2 id="alarm-drawer-title" className="mt-1 font-mono text-[15px] leading-snug font-medium break-words">
                {row.point}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={row.severity} analyzing />
                {row.caption && (
                  <span className="rounded-md bg-slate-900/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-800">
                    {row.caption}
                  </span>
                )}
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="-mr-1 rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-900/[0.05] hover:text-slate-900"
              aria-label="ปิดรายละเอียด"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {unacked && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-steel-100/70 px-3.5 py-2.5 ring-1 ring-steel-200 ring-inset">
                <p className="text-sm text-steel-800">alarm นี้ยังไม่ได้ acknowledge</p>
                <button
                  type="button"
                  onClick={onAck}
                  className="touch-target inline-flex shrink-0 items-center gap-1.5 rounded-md bg-steel-600 px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-steel-700"
                >
                  <BellCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Acknowledge
                </button>
              </div>
            )}

            <section aria-labelledby="drawer-value">
              <h3 id="drawer-value" className="text-xs font-medium text-slate-600">
                ค่าที่วัดได้
              </h3>
              <div className="mt-1.5">
                <ValueCell row={row} layout="inline" />
              </div>
            </section>

            <section aria-labelledby="drawer-actions">
              <h3 id="drawer-actions" className="text-xs font-medium text-slate-600">
                การดำเนินการที่แนะนำ
              </h3>
              {analyzed ? (
                actions.length > 0 ? (
                  <ol className="mt-2 space-y-1.5">
                    {actions.map((a, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-slate-800">
                        <span className="mt-px w-5 shrink-0 text-right font-mono text-xs text-slate-500 tnum">{i + 1}.</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">ไม่มีรายการแนะนำ</p>
                )
              ) : (
                <div className="mt-2 space-y-2" aria-label="กำลังวิเคราะห์">
                  <p className="text-sm text-slate-600">กำลังวิเคราะห์… ผลจะแสดงเมื่อระบบบันทึกกลับมา</p>
                  <div className="h-3 w-11/12 rounded bg-slate-200 motion-safe:animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-slate-200 motion-safe:animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-slate-200 motion-safe:animate-pulse" />
                </div>
              )}
            </section>

            <section
              aria-label="ข้อควรปฏิบัติ"
              className="rounded-lg border border-amber-300/80 bg-amber-50/90 px-3.5 py-3 text-sm text-amber-950"
            >
              <div className="flex gap-2.5">
                <TriangleExclamationPoint aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.75} />
                <div className="space-y-1.5">
                  <p className="font-medium">ห้ามสั่ง Close/Reset อุปกรณ์จนกว่าจะตรวจสอบหน้างานและได้รับอนุญาตจาก Dispatch</p>
                  <p>ผลวิเคราะห์จาก AI ใช้เป็นข้อมูลประกอบเท่านั้น ให้ยึด procedure ของสถานี</p>
                </div>
              </div>
            </section>

            <section aria-labelledby="drawer-meta">
              <h3 id="drawer-meta" className="text-xs font-medium text-slate-600">
                ข้อมูลการประมวลผล
              </h3>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-slate-600">รับเข้าระบบ</dt>
                <dd className="text-slate-900 tnum">{formatDateTime(row.received_at)}</dd>
                <dt className="text-slate-600">วิเคราะห์เสร็จ</dt>
                <dd className="text-slate-900 tnum">{formatDateTime(row.analyzed_at)}</dd>
                <dt className="text-slate-600">ใช้เวลา</dt>
                <dd className="text-slate-900 tnum">{formatDuration(row.received_at, row.analyzed_at)}</dd>
                <dt className="text-slate-600">โมเดล</dt>
                <dd className="font-mono text-[13px] break-all text-slate-900">{row.ai_model ?? "—"}</dd>
                {ack && (
                  <>
                    <dt className="text-slate-600">Acknowledge</dt>
                    <dd className="text-slate-900 tnum">
                      {formatDateTime(ack.at)}
                      {ack.by && <span className="block text-[13px] break-all text-slate-600">โดย {ack.by}</span>}
                    </dd>
                  </>
                )}
                <dt className="text-slate-600">Alarm ID</dt>
                <dd className="font-mono text-[12px] break-all text-slate-700">{row.id}</dd>
              </dl>
            </section>
          </div>
        </div>
      )}
    </dialog>
  );
}
