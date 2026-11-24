"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { getAlarmStatusAction } from "@/app/test/actions";
import { formatDuration, splitActions } from "@/lib/format";
import type { AlarmRow } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";

const POLL_MS = 3_000;
const MAX_MS = 120_000;

type Phase = "waiting" | "done" | "timeout" | "missing";

/** ติดตามผลของ alarm ที่เพิ่งส่ง: poll alarm_view ทุก 3 วินาที สูงสุด 2 นาที */
export function AnalysisTracker({ id, onSettled }: { id: string; onSettled: () => void }) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [row, setRow] = useState<AlarmRow | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pollError, setPollError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // เมื่อส่งสำเร็จ (component นี้ mount ใหม่ทุกครั้งที่ส่ง) เลื่อนลงมาที่ส่วนติดตามผล
  // หน่วงเล็กน้อยให้ dialog ยืนยันปิดและคืน focus เสร็จก่อน แล้วย้าย focus มาที่หัวข้อ
  useEffect(() => {
    const t = window.setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sectionRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const started = Date.now();

    const tick = async () => {
      const res = await getAlarmStatusAction(id);
      if (cancelled) return;
      const spent = Date.now() - started;
      setElapsed(Math.floor(spent / 1000));
      if (res.ok) {
        setPollError(null);
        setRow(res.row);
        if (res.row === null) {
          setPhase("missing");
          onSettled();
          return;
        }
        if (res.row.severity !== null) {
          setPhase("done");
          onSettled();
          return;
        }
      } else {
        setPollError(res.error);
      }
      if (spent >= MAX_MS) {
        setPhase("timeout");
        return;
      }
      timer = window.setTimeout(tick, POLL_MS);
    };

    timer = window.setTimeout(tick, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // onSettled ตั้งใจไม่ใส่ใน deps เพื่อไม่ให้เริ่ม poll ใหม่ทุกครั้งที่ parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, run]);

  const actions = splitActions(row?.recommended_action ?? null);

  return (
    <section ref={sectionRef} aria-labelledby="tracker-title" className="glass scroll-mt-20 rounded-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-900/[0.06] px-4 py-3">
        <h2 ref={headingRef} id="tracker-title" tabIndex={-1} className="text-sm font-semibold text-slate-900 focus:outline-none">
          ติดตามผล
        </h2>
        <p className="font-mono text-[11px] break-all text-slate-600">id {id}</p>
      </div>

      <ol className="space-y-0 px-4 py-4" aria-live="polite">
        <Step state="done" title="บันทึกแล้ว" last={false}>
          บันทึกลงฐานข้อมูลสำเร็จ — Database Webhook จะส่งต่อไปที่ Make
        </Step>

        <Step
          state={phase === "waiting" ? "active" : phase === "done" ? "done" : "problem"}
          title="รอ AI วิเคราะห์"
          last={false}
        >
          {phase === "waiting" && (
            <span className="tnum">
              ตรวจสอบทุก 3 วินาที · ผ่านไป {elapsed} วินาที (สูงสุด 120)
            </span>
          )}
          {phase === "done" && row && <span className="tnum">ใช้เวลา {formatDuration(row.received_at, row.analyzed_at)}</span>}
          {phase === "missing" && <span>ไม่พบแถวนี้ใน alarm_view แล้ว (อาจถูกลบไป)</span>}
          {phase === "timeout" && (
            <div className="mt-1 space-y-2 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-amber-950">
              <p className="font-medium">ยังไม่มีผลภายใน 2 นาที</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>Make → Scenario → History: มีการรันจาก webhook นี้หรือไม่ และมี error หรือไม่</li>
                <li>Scenario เปิดอยู่ (ON) และไม่ได้ถูกหยุดเพราะ credit หมด</li>
                <li>Supabase → Database → Webhooks: webhook ที่ตั้งไว้สำหรับการเพิ่ม alarm (INSERT) ยังเปิดอยู่</li>
                <li>ดู response ของ webhook queue ในตาราง net._http_response (pg_net)</li>
              </ul>
              <button
                type="button"
                onClick={() => {
                  setPhase("waiting");
                  setElapsed(0);
                  setRun((r) => r + 1);
                }}
                className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100"
              >
                ตรวจสอบต่ออีก 2 นาที
              </button>
            </div>
          )}
          {pollError && phase === "waiting" && <p className="mt-1 text-red-700">ตรวจสอบสถานะไม่สำเร็จ: {pollError} (จะลองใหม่)</p>}
        </Step>

        <Step state={phase === "done" ? "done" : "idle"} title="ผลวิเคราะห์" last>
          {phase === "done" && row ? (
            <div className="mt-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={row.severity} />
                <span className="rounded-md bg-slate-900/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-800">
                  {row.caption}
                </span>
                {row.ai_model && <span className="font-mono text-[11px] text-slate-600">{row.ai_model}</span>}
              </div>
              {actions.length > 0 && (
                <ol className="space-y-1 text-slate-800">
                  {actions.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-500 tnum">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : (
            <span className="text-slate-500">จะแสดง caption / severity / การดำเนินการที่แนะนำ เมื่อได้ผล</span>
          )}
        </Step>
      </ol>
    </section>
  );
}

function Step({
  state,
  title,
  last,
  children,
}: {
  state: "done" | "active" | "problem" | "idle";
  title: string;
  last: boolean;
  children: React.ReactNode;
}) {
  const marker =
    state === "done" ? (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-steel-600 text-white">
        <Check aria-hidden className="h-3 w-3" strokeWidth={2.5} />
      </span>
    ) : state === "active" ? (
      <span className="grid h-5 w-5 place-items-center rounded-full border border-steel-500 bg-white text-steel-600">
        <LoaderCircle aria-hidden className="h-3 w-3 motion-safe:animate-spin" strokeWidth={2} />
      </span>
    ) : state === "problem" ? (
      <span className="grid h-5 w-5 place-items-center rounded-full border border-amber-500 bg-amber-50 text-[11px] font-semibold text-amber-800">
        !
      </span>
    ) : (
      <span className="h-5 w-5 rounded-full border border-slate-300 bg-white" />
    );

  const stateText = { done: "เสร็จแล้ว", active: "กำลังดำเนินการ", problem: "ต้องตรวจสอบ", idle: "ยังไม่ถึงขั้นนี้" }[state];

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden className="absolute top-6 bottom-1 left-[9.5px] w-px bg-slate-300" />}
      <span className="relative shrink-0">{marker}</span>
      <div className="min-w-0 flex-1 text-sm">
        <p className={`font-medium ${state === "idle" ? "text-slate-500" : "text-slate-900"}`}>
          {title}
          <span className="sr-only"> ({stateText})</span>
        </p>
        <div className="mt-0.5 text-slate-700">{children}</div>
      </div>
    </li>
  );
}
