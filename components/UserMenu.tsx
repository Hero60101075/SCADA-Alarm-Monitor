/* eslint-disable @next/next/no-img-element -- รูปโปรไฟล์มาจาก Google (URL ภายนอก) */
import Link from "next/link";
import { History, LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";
import { isMockModeEnv } from "@/lib/auth-config";

/** แสดงผู้ใช้ที่ login อยู่ + ปุ่มออกจากระบบ (อยู่ใน Suspense ของ SiteHeader) */
export async function UserMenu() {
  if (isMockModeEnv()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const label = user.name ?? user.email ?? "ผู้ใช้";

  return (
    <div className="flex min-w-0 items-center gap-2 border-l border-slate-900/[0.08] pl-3">
      {user.role === "ADMIN" && (
        <Link
          href="/admin/visits"
          className="touch-target inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap text-slate-700 transition-colors duration-150 hover:bg-white"
        >
          <History aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden md:inline">ประวัติเข้าชม</span>
          <span className="sr-only md:hidden">ประวัติการเข้าชม</span>
        </Link>
      )}
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" width={28} height={28} referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />
      ) : (
        <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-steel-600 text-xs font-semibold text-white">
          {label.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="hidden min-w-0 leading-tight lg:block">
        <span className="flex items-center gap-1.5">
          <span className="block max-w-44 truncate text-xs font-medium text-slate-900">{label}</span>
          <span
            className={`rounded px-1 py-px text-[10px] font-semibold tracking-wide ring-1 ring-inset ${
              user.role === "ADMIN" ? "bg-steel-600 text-white ring-steel-600" : "bg-white text-slate-600 ring-slate-300"
            }`}
          >
            {user.role}
          </span>
        </span>
        {user.email && user.name && <span className="block max-w-44 truncate text-[11px] text-slate-600">{user.email}</span>}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          title="ออกจากระบบ"
          className="touch-target inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-white"
        >
          <LogOut aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="sr-only sm:not-sr-only">ออกจากระบบ</span>
        </button>
      </form>
    </div>
  );
}
