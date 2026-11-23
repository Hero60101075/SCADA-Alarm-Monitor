"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FunnelX, LoaderCircle, Search } from "lucide-react";
import { SEVERITY_FILTERS, type AlarmFilters, type SeverityFilter } from "@/lib/types";
import { SeverityDot } from "./SeverityBadge";

const SEV_LABEL: Record<SeverityFilter, string> = {
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  INFO: "INFO",
  PENDING: "รอวิเคราะห์",
};

function buildQuery(f: AlarmFilters): string {
  const p = new URLSearchParams();
  if (f.severities.length > 0) p.set("severity", f.severities.join(","));
  if (f.sub) p.set("sub", f.sub);
  if (f.q) p.set("q", f.q);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** ตัวกรองทั้งหมดเก็บใน URL search params (แชร์ลิงก์/รีเฟรชแล้วค่าไม่หาย) */
export function Filters({ value, stations }: { value: AlarmFilters; stations: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(value.q ?? "");
  const debounce = useRef<number | undefined>(undefined);

  const apply = (next: AlarmFilters) => {
    startTransition(() => {
      router.replace(`${pathname}${buildQuery(next)}`, { scroll: false });
    });
  };

  useEffect(() => () => window.clearTimeout(debounce.current), []);

  const onSearch = (text: string) => {
    setQ(text);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      apply({ ...value, q: text.trim() || null });
    }, 300);
  };

  const toggleSeverity = (s: SeverityFilter) => {
    const has = value.severities.includes(s);
    const severities = has ? value.severities.filter((x) => x !== s) : SEVERITY_FILTERS.filter((x) => x === s || value.severities.includes(x));
    apply({ ...value, severities });
  };

  const hasAny = value.severities.length > 0 || value.sub !== null || value.q !== null;
  const stationOptions = value.sub && !stations.includes(value.sub) ? [value.sub, ...stations] : stations;

  return (
    <div role="search" aria-label="ตัวกรอง alarm" className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Severity (เลือกได้หลายค่า)</legend>
        <span aria-hidden className="mr-1 text-xs text-slate-600">
          Severity
        </span>
        {SEVERITY_FILTERS.map((s) => {
          const active = value.severities.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => toggleSeverity(s)}
              className={`touch-target inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 transition-colors duration-150 ring-inset ${
                active
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white/80 text-slate-700 ring-slate-300 hover:bg-white hover:text-slate-900"
              }`}
            >
              <SeverityDot severity={s === "PENDING" ? null : s} className={active ? "ring-1 ring-white/70" : ""} />
              {SEV_LABEL[s]}
            </button>
          );
        })}
      </fieldset>

      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <span className="shrink-0">สถานี</span>
          <select
            value={value.sub ?? ""}
            onChange={(e) => apply({ ...value, sub: e.target.value || null })}
            className="h-8 min-w-28 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 sm:flex-none"
          >
            <option value="">ทุกสถานี</option>
            {stationOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="relative flex items-center sm:w-64">
          <span className="sr-only">ค้นหาชื่อ Point</span>
          <Search aria-hidden className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ค้นหาชื่อ Point"
            maxLength={100}
            className="h-8 w-full rounded-md border border-slate-300 bg-white pr-8 pl-8 font-mono text-[13px] text-slate-900 placeholder:font-sans placeholder:text-slate-500"
          />
          {isPending && (
            <LoaderCircle aria-hidden className="absolute right-2.5 h-3.5 w-3.5 text-slate-500 motion-safe:animate-spin" strokeWidth={1.75} />
          )}
        </label>

        {hasAny && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              window.clearTimeout(debounce.current);
              apply({ severities: [], sub: null, q: null });
            }}
            className="touch-target inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-steel-700 transition-colors duration-150 hover:bg-white"
          >
            <FunnelX aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
}
