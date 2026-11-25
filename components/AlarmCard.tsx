"use client";

import { formatEventDate, formatEventTime } from "@/lib/format";
import type { AlarmRow } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { ValueCell } from "./ValueCell";
import { ScrambleText } from "./ScrambleText";

interface AlarmCardProps {
  row: AlarmRow;
  highlighted: boolean;
  /** ยังไม่ acknowledge (กด ack ได้ในหน้ารายละเอียด) */
  unacked: boolean;
  onSelect: (row: AlarmRow) => void;
}

/** การ์ดสำหรับมือถือ (ทั้งใบเป็นปุ่ม) */
export function AlarmCard({ row, highlighted, unacked, onSelect }: AlarmCardProps) {
  const pending = row.severity === null;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onSelect(row)}
      className={`block w-full px-3.5 py-3 text-left transition-colors duration-200 ${
        highlighted
          ? "bg-red-50/90 shadow-[inset_3px_0_0_var(--color-red-600)]"
          : unacked
            ? "bg-steel-100/70 shadow-[inset_3px_0_0_var(--color-steel-600)]"
            : "active:bg-white/80"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="text-slate-600">{formatEventDate(row)}</span>
        <span className="font-mono text-[13px] text-slate-800 tnum"><ScrambleText text={formatEventTime(row.event_time)} /></span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-800">{row.sub}</span>
        <span className="text-slate-400">·</span>
        <span className="font-mono">{row.point_type}</span>
        <span className="ml-auto">
          <SeverityBadge severity={row.severity} analyzing />
        </span>
      </div>
      {unacked && <span className="sr-only">ยังไม่ acknowledge</span>}
      <p className="mt-1.5 font-mono text-[13px] leading-snug font-medium break-words text-slate-900">
        <ScrambleText text={row.point} />
      </p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <ValueCell row={row} layout="inline" />
        {pending ? (
          <span aria-hidden className="h-3 w-14 shrink-0 rounded bg-slate-200 motion-safe:animate-pulse" />
        ) : (
          <span className="shrink-0 font-mono text-[12px] font-medium text-slate-800"><ScrambleText text={row.caption ?? ""} /></span>
        )}
      </div>
    </button>
  );
}
