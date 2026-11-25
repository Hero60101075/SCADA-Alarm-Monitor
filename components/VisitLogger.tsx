"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logVisitAction } from "@/app/auth/visit";

/** บันทึกการเข้าชมทุกครั้งที่ path เปลี่ยน (router.refresh ของ AutoRefresh ไม่เปลี่ยน path จึงไม่ถูกนับ) */
export function VisitLogger() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/auth/")) return;
    void logVisitAction(pathname).catch(() => {});
  }, [pathname]);
  return null;
}
