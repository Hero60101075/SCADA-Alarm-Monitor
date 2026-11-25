import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 mb-4 border-b border-slate-900/[0.06] bg-[#f5f6f8]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-350 items-center gap-4 px-3 sm:px-5 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md" aria-label="Alarm Monitor — กลับไปหน้า Dashboard">
          {/* โลโก้เป็นภาพประกอบ ชื่อระบบอยู่ข้างๆ แล้ว จึงใช้ alt ว่าง */}
          <Image
            src="/favicon-dark.svg"
            alt=""
            width={28}
            height={28}
            priority
            unoptimized
            className="h-7 w-7 shrink-0"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-tight text-slate-900">Alarm Monitor</span>
            <span className="hidden truncate text-[11px] text-slate-600 sm:block">ศูนย์ควบคุม · alarm และผลวิเคราะห์</span>
          </span>
        </Link>
        <NavLinks />
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
