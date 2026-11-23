import type { ReactNode } from "react";
import { CircleCheck, TriangleExclamationPoint } from "lucide-react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <CircleCheck aria-hidden className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
      <p className="mt-3 text-sm font-medium text-slate-800">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-4 text-sm text-red-900">
      <TriangleExclamationPoint aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-red-700" strokeWidth={1.75} />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}

export function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200 ring-inset">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      โหมดข้อมูลจำลอง (USE_MOCK_DATA)
    </span>
  );
}
