import { formatNumber, thresholdState } from "@/lib/format";
import type { AlarmRow } from "@/lib/types";

/** ค่า + threshold + เครื่องหมายเกิน/ต่ำกว่า (คำนวณจากข้อมูลดิบ ไม่ได้มาจาก AI) */
export function ValueCell({
  row,
  layout = "stack",
}: {
  row: Pick<AlarmRow, "value" | "low_th" | "high_th">;
  layout?: "stack" | "inline";
}) {
  const state = thresholdState(row);
  const hasTh = row.low_th !== null || row.high_th !== null;
  return (
    <div className={layout === "stack" ? "flex flex-col items-end gap-0.5" : "flex flex-wrap items-baseline gap-x-2 gap-y-0.5"}>
      <span className="flex items-baseline gap-1.5">
        {state && <ThresholdFlag state={state} />}
        <span className={`font-mono text-[13px] tnum ${state ? "font-medium text-red-800" : "text-slate-900"}`}>
          {formatNumber(row.value)}
        </span>
      </span>
      {hasTh && (
        <span className="font-mono text-[11px] text-slate-600 tnum">
          L {formatNumber(row.low_th)} · H {formatNumber(row.high_th)}
        </span>
      )}
    </div>
  );
}

export function ThresholdFlag({ state }: { state: "HIGH" | "LOW" }) {
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-[4px] bg-red-50 px-1 text-[11px] font-medium text-red-800 ring-1 ring-inset ring-red-200">
      <span aria-hidden>{state === "HIGH" ? "▲" : "▼"}</span>
      {state === "HIGH" ? "เกิน High" : "ต่ำกว่า Low"}
    </span>
  );
}
