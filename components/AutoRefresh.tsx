"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";
import { formatClock } from "@/lib/format";

const INTERVAL_MS = 10_000;

/**
 * เรียก router.refresh() ทุก 10 วินาที → Server Components ดึงข้อมูลใหม่จาก Supabase
 * fetchedAt มาจาก server ในรอบที่ render ล่าสุด จึงเป็นเวลาที่ข้อมูลถูกดึงจริง
 */
export function AutoRefresh({ fetchedAt }: { fetchedAt: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      // ไม่ต้องดึงข้อมูลขณะแท็บถูกซ่อน
      if (document.visibilityState !== "visible") return;
      startTransition(() => router.refresh());
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [running, router]);

  // กลับมาที่แท็บ → ดึงข้อมูลทันที
  useEffect(() => {
    if (!running) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, router]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5" aria-live="off">
        {isPending ? (
          <LoaderCircle aria-hidden className="h-3.5 w-3.5 text-slate-500 motion-safe:animate-spin" strokeWidth={1.75} />
        ) : (
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-600" : "bg-slate-400"}`}
          />
        )}
        <span>
          {running ? "อัปเดตอัตโนมัติ" : "หยุดอัปเดต"} · ล่าสุด{" "}
          <time dateTime={fetchedAt} className="font-mono text-slate-800 tnum">
            {formatClock(fetchedAt)}
          </time>
        </span>
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="touch-target inline-flex min-w-8 items-center justify-center rounded-md p-1.5 text-slate-600 transition-colors duration-150 hover:bg-white hover:text-slate-900 disabled:opacity-50"
        aria-label="อัปเดตตอนนี้"
        title="อัปเดตตอนนี้"
      >
        <RefreshCw aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        aria-pressed={!running}
        className="touch-target inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50"
      >
        {running ? (
          <>
            <Pause aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            หยุด
          </>
        ) : (
          <>
            <Play aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            เริ่ม
          </>
        )}
      </button>
    </div>
  );
}
