"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", short: "Dashboard" },
  { href: "/test", label: "ทดสอบเพิ่ม alarm", short: "ทดสอบ" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="ml-auto flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`touch-target inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1.5 sm:px-3 text-sm transition-colors duration-150 ${
              active
                ? "bg-white font-medium text-slate-900 shadow-[0_0_0_1px_rgb(15_23_42/0.08)]"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            <span className="sm:hidden">{l.short}</span>
            <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
