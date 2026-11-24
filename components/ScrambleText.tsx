"use client";

import { useEffect, useRef } from "react";

/**
 * เอฟเฟกต์ "ถอดรหัส" ตอนแสดงหน้าครั้งแรก: สุ่มตัวอักษรแล้วค่อยๆ ลงตัวเป็นข้อความจริงจากซ้ายไปขวา
 * - เล่นเฉพาะช่วงแรกที่หน้าแสดงผล (component ที่ mount ภายในหน้าต่างเวลาแรก) ไม่เล่นซ้ำตอน auto refresh
 * - ข้อความจริงยังเป็น React children เสมอ ตัวอักษรสุ่มอยู่ในชั้นซ้อน (aria-hidden) ที่ effect เขียนเอง
 * - เคารพ prefers-reduced-motion
 */

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>";
const KEEP = /[\s.,:·\-–—/()]/; // คงเครื่องหมายเว้นวรรค/วรรคตอนไว้ รูปทรงข้อความจะได้ไม่กระโดด
const WINDOW_MS = 1500; // ช่วงเวลาหลัง mount ตัวแรกที่ยังเล่นเอฟเฟกต์
const DURATION_MS = 900;
const TICK_MS = 45;

let windowEnd: number | null = null;

function shouldAnimate(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    /* ไม่รองรับ matchMedia — เล่นตามปกติ */
  }
  const now = performance.now();
  if (windowEnd === null) windowEnd = now + WINDOW_MS;
  return now <= windowEnd;
}

function randomChar(): string {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const realRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const real = realRef.current;
    const overlay = overlayRef.current;
    if (!real || !overlay || text.length === 0 || !shouldAnimate()) return;

    const chars = [...text];
    const n = chars.length;
    // เวลาที่ตัวอักษรตัวที่ i ลงตัว (ms) — ไล่จากซ้ายไปขวา
    const settleAt = chars.map((_, i) => 200 + (n > 1 ? (i / (n - 1)) * (DURATION_MS - 200) : 0));

    let raf = 0;
    let last = -Infinity;
    const start = performance.now();
    real.style.visibility = "hidden";

    const finish = () => {
      overlay.textContent = "";
      real.style.visibility = "";
    };

    const frame = (now: number) => {
      const t = now - start;
      if (t >= DURATION_MS) {
        finish();
        return;
      }
      if (now - last >= TICK_MS) {
        last = now;
        overlay.textContent = chars.map((c, i) => (KEEP.test(c) || t >= settleAt[i] ? c : randomChar())).join("");
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      finish();
    };
  }, [text]);

  return (
    <span className={`relative inline-block max-w-full align-top ${className}`}>
      <span ref={realRef}>{text}</span>
      <span ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 select-none" />
    </span>
  );
}
