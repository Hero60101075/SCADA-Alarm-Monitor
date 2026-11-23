"use client";

import { ErrorState } from "@/components/StatePanels";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">Dashboard</h1>
      <ErrorState title="แสดงหน้านี้ไม่สำเร็จ" message="เกิดข้อผิดพลาดระหว่างแสดงผล กรุณาลองใหม่อีกครั้ง">
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-md bg-steel-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-steel-700"
        >
          ลองใหม่
        </button>
      </ErrorState>
    </div>
  );
}
