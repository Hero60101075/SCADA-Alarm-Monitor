import { Info } from "lucide-react";

/** แจ้งผู้ใช้ทุกหน้าว่าข้อมูลที่แสดงเป็นข้อมูลจำลอง ไม่ใช่ข้อมูลจริง */
export function DemoNotice() {
  return (
    <div role="note" aria-label="ประกาศเกี่ยวกับข้อมูล" className="mx-auto -mt-1 mb-4 w-full max-w-350 px-3 sm:px-5 lg:px-8">
      <div className="flex items-start gap-2 rounded-lg border border-slate-300/80 bg-white/75 px-3 py-2 text-xs text-slate-700 backdrop-blur-md sm:items-center sm:text-[13px]">
        <Info aria-hidden className="mt-px h-4 w-4 shrink-0 text-steel-600 sm:mt-0" strokeWidth={1.75} />
        <p>
          <span className="font-semibold text-slate-900">ข้อมูลจำลอง</span>
          <span className="mx-1.5 text-slate-400" aria-hidden>
            ·
          </span>
          ข้อมูล alarm และผลวิเคราะห์ที่แสดงในเว็บไซต์นี้เป็นข้อมูลจำลองเพื่อการทดสอบและสาธิตเท่านั้น
          ไม่ใช่ข้อมูลจริงจากสถานีไฟฟ้า
        </p>
      </div>
    </div>
  );
}
