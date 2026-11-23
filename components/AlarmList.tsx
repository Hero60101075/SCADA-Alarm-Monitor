"use client";

import { useEffect, useState } from "react";
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
export function AlarmList({ rows }: { rows: AlarmRow[] }) {
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

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {highlightedCount > 0 ? `มี alarm ระดับ CRITICAL เข้ามาใหม่ ${highlightedCount} รายการ` : ""}
      </p>

      <div className="hidden md:block">
        <AlarmTable rows={rows} highlighted={track.highlighted} onSelect={open} />
      </div>

      <ul className="divide-y divide-slate-900/[0.06] md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <AlarmCard row={r} highlighted={track.highlighted.has(r.id)} onSelect={open} />
          </li>
        ))}
      </ul>

      <AlarmDrawer row={selected} open={selectedId !== null} onClose={() => setSelectedId(null)} />
    </>
  );
}
