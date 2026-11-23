import type { Severity } from "@/lib/types";

const STYLES: Record<Severity | "PENDING", { label: string; box: string; dot: string }> = {
  CRITICAL: {
    label: "CRITICAL",
    box: "bg-red-50 text-red-800 ring-red-200",
    dot: "bg-red-600",
  },
  WARNING: {
    label: "WARNING",
    box: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
  },
  INFO: {
    label: "INFO",
    box: "bg-info-50 text-info-800 ring-info-200",
    dot: "bg-info-500",
  },
  PENDING: {
    label: "รอวิเคราะห์",
    box: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  },
};

export const SEVERITY_LABEL_TH: Record<Severity | "PENDING", string> = {
  CRITICAL: "วิกฤต",
  WARNING: "เตือน",
  INFO: "ข้อมูล",
  PENDING: "รอวิเคราะห์",
};

export function SeverityDot({ severity, className = "" }: { severity: Severity | null; className?: string }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STYLES[severity ?? "PENDING"].dot} ${className}`} />;
}

export function SeverityBadge({
  severity,
  analyzing = false,
}: {
  severity: Severity | null;
  /** แสดงเป็น "กำลังวิเคราะห์…" สำหรับแถวที่ยังไม่มีผล */
  analyzing?: boolean;
}) {
  const s = STYLES[severity ?? "PENDING"];
  const label = severity === null && analyzing ? "กำลังวิเคราะห์…" : s.label;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide ring-1 ring-inset ${s.box}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${s.dot} ${severity === null && analyzing ? "motion-safe:animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
