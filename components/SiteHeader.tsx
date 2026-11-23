import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 mb-4 border-b border-slate-900/[0.06] bg-[#f5f6f8]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-350 items-center gap-4 px-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-300 bg-white">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-steel-600" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">SCADA Alarm Monitor</p>
            <p className="hidden truncate text-[11px] text-slate-600 sm:block">ศูนย์ควบคุม · alarm และผลวิเคราะห์</p>
          </div>
        </div>
        <NavLinks />
      </div>
    </header>
  );
}
