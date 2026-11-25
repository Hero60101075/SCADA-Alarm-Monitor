"use client";

import { ChevronRight } from "lucide-react";
import { formatEventDate, formatEventTime } from "@/lib/format";
import type { AlarmRow } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { ValueCell } from "./ValueCell";
import { ScrambleText } from "./ScrambleText";

interface AlarmTableProps {
  rows: AlarmRow[];
  highlighted: ReadonlySet<string>;
  /** id ที่ยังไม่ acknowledge → พื้นหลังต่างจนกว่าจะกด ack */
  unacked: ReadonlySet<string>;
  onAck: (id: string) => void;
  onSelect: (row: AlarmRow) => void;
}

// หัวตารางตรึงต่อใต้ SiteHeader (3.5rem) + ส่วนหัวรายการ (--list-head-h จาก StickyListHeader)
const TH =
  "sticky top-[calc(3.5rem+var(--list-head-h,0px))] z-10 bg-white/95 backdrop-blur-xl px-3 py-2 text-left text-[11px] font-medium tracking-wide text-slate-600 uppercase";

/** ตารางสำหรับจอกว้าง (md ขึ้นไป) */
export function AlarmTable({ rows, highlighted, unacked, onAck, onSelect }: AlarmTableProps) {
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <caption className="sr-only">รายการ alarm ล่าสุด เรียงจากใหม่ไปเก่า กดที่ชื่อ Point เพื่อดูรายละเอียด</caption>
      <thead>
        <tr className="[&>th]:border-b [&>th]:border-slate-900/[0.08]">
          <th scope="col" className={`${TH} w-24 pl-4`}>วันที่ / เวลา</th>
          <th scope="col" className={`${TH} w-20`}>สถานี</th>
          <th scope="col" className={TH}>
            Point<span className="lg:hidden"> · Type</span>
          </th>
          <th scope="col" className={`${TH} hidden w-14 lg:table-cell`}>Type</th>
          <th scope="col" className={`${TH} w-40 text-right lg:w-44`}>Value</th>
          <th scope="col" className={`${TH} hidden w-28 lg:table-cell`}>Caption</th>
          <th scope="col" className={`${TH} w-36 pr-4`}>
            Severity<span className="lg:hidden"> · Caption</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const hl = highlighted.has(r.id);
          const pending = r.severity === null;
          const isNew = unacked.has(r.id);
          return (
            <tr
              key={r.id}
              onClick={() => onSelect(r)}
              className={`group cursor-pointer transition-colors duration-200 [&>td]:border-b [&>td]:border-slate-900/[0.05] ${
                hl
                  ? "bg-red-50/90 [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-red-600)]"
                  : isNew
                    ? "bg-steel-100/70 hover:bg-steel-100 [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-steel-600)]"
                    : "hover:bg-white/80"
              }`}
            >
              <td className="py-2 pr-3 pl-4 align-top font-mono text-[13px] text-slate-800 tnum">
                <ScrambleText text={formatEventTime(r.event_time)} />
                <span className="mt-0.5 block font-sans text-[11px] whitespace-nowrap text-slate-600">{formatEventDate(r)}</span>
              </td>
              <td className="px-3 py-2 align-top text-slate-800">{r.sub}</td>
              <td className="px-3 py-2 align-top">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(r);
                  }}
                  className="flex items-center gap-1 text-left font-mono text-[13px] font-medium break-words text-slate-900 group-hover:text-steel-700"
                >
                  <ScrambleText text={r.point} />
                  <ChevronRight
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    strokeWidth={1.75}
                  />
                </button>
                <span className="mt-0.5 block font-mono text-[11px] text-slate-600 lg:hidden">{r.point_type}</span>
              </td>
              <td className="hidden px-3 py-2 align-top font-mono text-[12px] text-slate-700 lg:table-cell">{r.point_type}</td>
              <td className="px-3 py-2 align-top text-right">
                <ValueCell row={r} />
              </td>
              <td className="hidden px-3 py-2 align-top lg:table-cell">
                {pending ? (
                  <span className="mt-1 block h-3 w-16 rounded bg-slate-200 motion-safe:animate-pulse" aria-hidden />
                ) : (
                  <span className="font-mono text-[12px] font-medium text-slate-800"><ScrambleText text={r.caption ?? ""} /></span>
                )}
              </td>
              <td className="py-2 pr-4 pl-3 align-top">
                <SeverityBadge severity={r.severity} analyzing />
                {!pending && (
                  <span className="mt-1 block font-mono text-[11px] font-medium text-slate-700 lg:hidden"><ScrambleText text={r.caption ?? ""} /></span>
                )}
                {isNew && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAck(r.id);
                    }}
                    aria-label={`Acknowledge ${r.point}`}
                    className="mt-1.5 block rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-steel-700 ring-1 ring-steel-200 ring-inset transition-colors duration-150 hover:bg-steel-600 hover:text-white hover:ring-steel-600"
                  >
                    Acknowledge
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
