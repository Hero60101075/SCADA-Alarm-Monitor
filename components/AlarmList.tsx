"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellCheck } from "lucide-react";
import { ackAlarmsAction } from "@/app/(dashboard)/actions";
import type { AckInfo } from "@/lib/acks";
import type { AlarmRow } from "@/lib/types";
import { AlarmCard } from "./AlarmCard";
import { AlarmDrawer } from "./AlarmDrawer";
import { AlarmTable } from "./AlarmTable";

const HIGHLIGHT_MS = 6000;

interface TrackState {
  prevRows: AlarmRow[] | null;
  /** id ที่เคยเห็นเป็น CRITICAL แล้ว */
  seenCritical: ReadonlySet<string>;
  highlighted: ReadonlySet<string>;
}

/**
 * ห่อตาราง/การ์ด + drawer และไฮไลต์ CRITICAL ที่เพิ่งเข้ามา (ใหม่ หรือเพิ่งได้ผลวิเคราะห์ว่าเป็น CRITICAL)
 * รอบแรกที่โหลดหน้าไม่ไฮไลต์อะไร
 */
export function AlarmList({ rows, acks }: { rows: AlarmRow[]; acks: Record<string, AckInfo> | null }) {
  const [track, setTrack] = useState<TrackState>(() => ({
    prevRows: rows,
    seenCritical: new Set(rows.filter((r) => r.severity === "CRITICAL").map((r) => r.id)),
    highlighted: new Set(),
  }));

  // ปรับ state ระหว่าง render เมื่อ props เปลี่ยน (แนวทางที่ React แนะนำ แทนการ setState ใน effect)
  if (track.prevRows !== rows) {
    const fresh = rows.filter((r) => r.severity === "CRITICAL" && !track.seenCritical.has(r.id)).map((r) => r.id);
    const seen = new Set(track.seenCritical);
    fresh.forEach((id) => seen.add(id));
    setTrack({
      prevRows: rows,
      seenCritical: seen,
      highlighted: fresh.length > 0 ? new Set([...track.highlighted, ...fresh]) : track.highlighted,
    });
  }

  useEffect(() => {
    if (track.highlighted.size === 0) return;
    const ids = [...track.highlighted];
    const t = window.setTimeout(() => {
      setTrack((s) => {
        const next = new Set(s.highlighted);
        ids.forEach((id) => next.delete(id));
        return { ...s, highlighted: next };
      });
    }, HIGHLIGHT_MS);
    return () => window.clearTimeout(t);
  }, [track.highlighted]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AlarmRow | null>(null);
  // ใช้ข้อมูลล่าสุดของแถวที่เลือก (เช่น ผล AI เพิ่งมา) ถ้าแถวหลุดจากรายการให้ใช้ข้อมูลเดิม
  const selected = (selectedId && rows.find((r) => r.id === selectedId)) || snapshot;

  const open = (row: AlarmRow) => {
    setSnapshot(row);
    setSelectedId(row.id);
  };

  const highlightedCount = rows.filter((r) => track.highlighted.has(r.id)).length;

  /* ---------- acknowledge (ใช้ร่วมกันทุกคน เก็บในตาราง alarm_acks) ---------- */
  const router = useRouter();
  const [pendingAck, startAck] = useTransition();
  // ack ที่กดแล้วแต่ข้อมูลจาก server ยังไม่ refresh (optimistic)
  const [localAcked, setLocalAcked] = useState<ReadonlySet<string>>(() => new Set());
  const [ackError, setAckError] = useState<string | null>(null);

  // acks === null = ยังไม่เปิดใช้ (ยังไม่ได้รัน SQL / โหมดจำลอง) → ไม่ไฮไลต์อะไร
  const unacked = useMemo(
    () => new Set(acks ? rows.filter((r) => !acks[r.id] && !localAcked.has(r.id)).map((r) => r.id) : []),
    [rows, acks, localAcked],
  );

  const ack = (ids: string[]) => {
    if (ids.length === 0) return;
    setAckError(null);
    setLocalAcked((s) => new Set([...s, ...ids]));
    startAck(async () => {
      const res = await ackAlarmsAction(ids);
      if (!res.ok) {
        setAckError(res.error);
        setLocalAcked((s) => {
          const next = new Set(s);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {highlightedCount > 0 ? `มี alarm ระดับ CRITICAL เข้ามาใหม่ ${highlightedCount} รายการ` : ""}
      </p>

      {(unacked.size > 0 || ackError) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-200 bg-steel-100/60 px-4 py-2 text-sm">
          <p className="text-steel-800" aria-live="polite">
            {ackError ? (
              <span className="text-red-700">{ackError}</span>
            ) : (
              <>
                มี alarm ใหม่ที่ยังไม่ acknowledge <span className="font-semibold tnum">{unacked.size}</span> รายการ
              </>
            )}
          </p>
          {unacked.size > 0 && (
            <button
              type="button"
              disabled={pendingAck}
              onClick={() => ack([...unacked])}
              className="touch-target inline-flex items-center gap-1.5 rounded-md bg-steel-600 px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-steel-700 disabled:opacity-60"
            >
              <BellCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              Acknowledge ทั้งหมด
            </button>
          )}
        </div>
      )}

      <div className="hidden md:block">
        <AlarmTable rows={rows} highlighted={track.highlighted} unacked={unacked} onAck={(id) => ack([id])} onSelect={open} />
      </div>

      <ul className="divide-y divide-slate-900/[0.06] md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <AlarmCard row={r} highlighted={track.highlighted.has(r.id)} unacked={unacked.has(r.id)} onSelect={open} />
          </li>
        ))}
      </ul>

      <AlarmDrawer
        row={selected}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        ack={selected && acks ? (acks[selected.id] ?? null) : null}
        unacked={selected ? unacked.has(selected.id) : false}
        onAck={() => selected && ack([selected.id])}
      />
    </>
  );
}
