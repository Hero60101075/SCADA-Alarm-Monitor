"use client";

import { ChevronRight } from "lucide-react";
import { formatEventTime } from "@/lib/format";
import type { AlarmRow } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { ValueCell } from "./ValueCell";

interface AlarmTableProps {
  rows: AlarmRow[];
  highlighted: ReadonlySet<string>;
  onSelect: (row: AlarmRow) => void;
}

const TH = "px-3 py-2 text-left text-[11px] font-medium tracking-wide text-slate-600 uppercase";

/** ตารางสำหรับจอกว้าง (md ขึ้นไป) */
export function AlarmTable({ rows, highlighted, onSelect }: AlarmTableProps) {
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <caption className="sr-only">รายการ alarm ล่าสุด เรียงจากใหม่ไปเก่า กดที่ชื่อ Point เพื่อดูรายละเอียด</caption>
      <thead>
        <tr className="[&>th]:border-b [&>th]:border-slate-900/[0.08]">
          <th scope="col" className={`${TH} w-16 pl-4`}>เวลา</th>
          <th scope="col" className={`${TH} w-20`}>สถานี</th>
          <th scope="col" className={TH}>Point</th>
          <th scope="col" className={`${TH} w-14`}>Type</th>
          <th scope="col" className={`${TH} w-44 text-right`}>Value</th>
          <th scope="col" className={`${TH} w-28`}>Caption</th>
          <th scope="col" className={`${TH} w-36 pr-4`}>Severity</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const hl = highlighted.has(r.id);
          const pending = r.severity === null;
          return (
            <tr
              key={r.id}
              onClick={() => onSelect(r)}
              className={`group cursor-pointer transition-colors duration-200 [&>td]:border-b [&>td]:border-slate-900/[0.05] ${
                hl ? "bg-red-50/90 [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-red-600)]" : "hover:bg-white/80"
              }`}
            >
              <td className="py-2 pr-3 pl-4 align-top font-mono text-[13px] text-slate-800 tnum">{formatEventTime(r.event_time)}</td>
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
                  {r.point}
                  <ChevronRight
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    strokeWidth={1.75}
                  />
                </button>
              </td>
              <td className="px-3 py-2 align-top font-mono text-[12px] text-slate-700">{r.point_type}</td>
              <td className="px-3 py-2 align-top text-right">
                <ValueCell row={r} />
              </td>
              <td className="px-3 py-2 align-top">
                {pending ? (
                  <span className="mt-1 block h-3 w-16 rounded bg-slate-200 motion-safe:animate-pulse" aria-hidden />
                ) : (
                  <span className="font-mono text-[12px] font-medium text-slate-800">{r.caption}</span>
                )}
              </td>
              <td className="py-2 pr-4 pl-3 align-top">
                <SeverityBadge severity={r.severity} analyzing />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
