"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * dialog ยืนยันโดยใช้ <dialog> แบบ modal ของเบราว์เซอร์
 * - showModal() ทำให้ส่วนอื่นของหน้า inert และกัก focus ไว้ใน dialog
 * - focus เริ่มที่ปุ่ม "ยกเลิก" (ปลอดภัยกว่า) และคืน focus ให้ปุ่มเดิมเมื่อปิด
 * - Esc / คลิกพื้นหลัง = ยกเลิก
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "ยกเลิก",
  tone = "primary",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dlg.showModal();
      cancelRef.current?.focus();
    } else if (!open && dlg.open) {
      dlg.close();
      returnFocusRef.current?.focus();
    }
  }, [open]);

  const titleId = "confirm-dialog-title";
  const confirmCls =
    tone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/60"
      : "bg-steel-600 text-white hover:bg-steel-700 disabled:bg-steel-600/60";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
      className="glass-strong m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-xl p-0 text-slate-900"
    >
      <div className="p-5 sm:p-6">
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-3 text-sm text-slate-700">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${confirmCls}`}
          >
            {pending && <LoaderCircle aria-hidden className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.75} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
