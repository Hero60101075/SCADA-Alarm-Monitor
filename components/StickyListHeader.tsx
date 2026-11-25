"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * ส่วนหัวรายการ (ชื่อ + ตัวกรอง) ที่ตรึงไว้ใต้ SiteHeader เมื่อเลื่อนหน้าลง (จอ md ขึ้นไป)
 * วัดความสูงตัวเองแล้วเก็บใน CSS variable --list-head-h บน element แม่
 * เพื่อให้หัวตาราง (thead) ตรึงต่อใต้ส่วนนี้ได้พอดี แม้ตัวกรองจะขึ้นบรรทัดใหม่
 */
export function StickyListHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const update = () => parent.style.setProperty("--list-head-h", `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`top-14 z-20 bg-white/90 backdrop-blur-xl md:sticky ${className}`}>
      {children}
    </div>
  );
}
