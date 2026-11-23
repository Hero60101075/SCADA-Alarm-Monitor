import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "เข้าสู่หน้าทดสอบ" };

export default function TestLoginPage() {
  return (
    <div className="mx-auto mt-8 max-w-sm sm:mt-16">
      <section aria-labelledby="login-title" className="glass rounded-xl px-5 py-6">
        <h1 id="login-title" className="text-base font-semibold tracking-tight text-slate-900">
          เข้าสู่หน้าทดสอบเพิ่ม alarm
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          หน้านี้ส่ง alarm เข้าระบบจริง (Make, AI, Gmail, LINE) จึงต้องใช้รหัสผ่านสำหรับทดสอบ
        </p>
        <LoginForm />
      </section>
    </div>
  );
}
