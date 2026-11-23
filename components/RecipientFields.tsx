"use client";

/* eslint-disable @next/next/no-img-element -- รูป QR มาจาก URL ภายนอกที่ตั้งใน env ไม่ผ่าน next/image */

import { ExternalLink } from "lucide-react";
import type { FieldErrors } from "@/lib/validation";

/** ค่าสาธารณะ ฝังตอน build (ไม่ใช่ความลับ) */
const QR_URL = process.env.NEXT_PUBLIC_LINE_OA_QR_URL;
const ADD_URL = process.env.NEXT_PUBLIC_LINE_OA_ADD_URL;

function safeHttpUrl(u: string | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const qrUrl = safeHttpUrl(QR_URL);
const addUrl = safeHttpUrl(ADD_URL);

interface RecipientFieldsProps {
  idPrefix: string;
  email: string;
  lineUserId: string;
  consent: boolean;
  errors: FieldErrors;
  hasStored: boolean;
  onChange: (field: "notify_email" | "notify_line_user_id", value: string) => void;
  onConsent: (checked: boolean) => void;
  onClearStored: () => void;
}

const inputCls =
  "h-9 w-full rounded-md border bg-white px-2.5 font-mono text-[13px] text-slate-900 transition-colors duration-150 placeholder:font-sans placeholder:text-slate-400 aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50/40";

export function RecipientFields({
  idPrefix,
  email,
  lineUserId,
  consent,
  errors,
  hasStored,
  onChange,
  onConsent,
  onClearStored,
}: RecipientFieldsProps) {
  const emailId = `${idPrefix}-notify_email`;
  const lineId = `${idPrefix}-notify_line_user_id`;
  const consentId = `${idPrefix}-consent`;
  const anyFilled = email.trim() !== "" || lineUserId.trim() !== "";

  return (
    <fieldset className="rounded-lg border border-slate-900/[0.08] bg-white/50 px-3.5 pt-2 pb-3.5">
      <legend className="px-1 text-xs font-semibold text-slate-800">ผู้รับแจ้งเตือน (ไม่บังคับ)</legend>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">ค่าที่กรอกจะถูกจำไว้ในเบราว์เซอร์นี้ ไม่ต้องกรอกซ้ำ</p>
        {hasStored && (
          <button
            type="button"
            onClick={onClearStored}
            className="rounded-md px-2 py-1 text-xs font-medium text-steel-700 transition-colors duration-150 hover:bg-white"
          >
            ล้างค่าที่จำไว้
          </button>
        )}
      </div>

      <div className="mt-2.5 grid gap-x-3 gap-y-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor={emailId} className="mb-1 block text-xs font-medium text-slate-700">
            Gmail
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            placeholder="name@gmail.com"
            value={email}
            onChange={(e) => onChange("notify_email", e.target.value)}
            aria-invalid={!!errors.notify_email}
            aria-describedby={`${emailId}-hint${errors.notify_email ? ` ${emailId}-err` : ""}`}
            className={inputCls}
          />
          {errors.notify_email && (
            <p id={`${emailId}-err`} className="mt-1 text-xs text-red-700">
              {errors.notify_email}
            </p>
          )}
          <p id={`${emailId}-hint`} className="mt-1 text-xs text-slate-600">
            ถ้าเว้นว่าง ระบบจะส่งไปยังผู้รับค่าเริ่มต้นของทีม
          </p>
        </div>

        <div>
          <label htmlFor={lineId} className="mb-1 block text-xs font-medium text-slate-700">
            LINE User ID
          </label>
          <input
            id={lineId}
            type="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            placeholder="U ตามด้วย 32 ตัวอักษร"
            value={lineUserId}
            onChange={(e) => onChange("notify_line_user_id", e.target.value)}
            aria-invalid={!!errors.notify_line_user_id}
            aria-describedby={`${lineId}-hint ${lineId}-howto${errors.notify_line_user_id ? ` ${lineId}-err` : ""}`}
            className={inputCls}
          />
          {errors.notify_line_user_id && (
            <p id={`${lineId}-err`} className="mt-1 text-xs text-red-700">
              {errors.notify_line_user_id}
            </p>
          )}
          <p id={`${lineId}-hint`} className="mt-1 text-xs text-slate-600">
            ถ้าเว้นว่าง ระบบจะส่งไปยังผู้รับค่าเริ่มต้นของทีม
          </p>
        </div>
      </div>

      <div id={`${lineId}-howto`} className="mt-3 rounded-md border border-slate-200 bg-white/80 px-3 py-2.5 text-xs text-slate-700">
        <p className="font-medium text-slate-800">วิธีหา LINE User ID</p>
        <p className="mt-0.5 font-medium text-red-800">
          LINE User ID ไม่ใช่ LINE ID ที่ใช้แอดเพื่อน (เช่น @yourname)
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          {qrUrl && (
            <img
              src={qrUrl}
              alt="QR code สำหรับแอดเพื่อน LINE OA"
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1"
            />
          )}
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              แอดเพื่อน LINE OA ของระบบ
              {qrUrl ? " โดยสแกน QR" : ""}
              {addUrl ? (
                <>
                  {qrUrl ? " หรือ" : ""}{" "}
                  <a
                    href={addUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-steel-700 underline underline-offset-2 hover:text-steel-800"
                  >
                    เปิดลิงก์แอดเพื่อน
                    <ExternalLink aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                    <span className="sr-only">(เปิดในแท็บใหม่)</span>
                  </a>
                </>
              ) : null}
              {!qrUrl && !addUrl && (
                <span className="text-slate-500"> (ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_OA_QR_URL / NEXT_PUBLIC_LINE_OA_ADD_URL)</span>
              )}
            </li>
            <li>พิมพ์ข้อความใดก็ได้ส่งไปที่ LINE OA</li>
            <li>
              บอทจะตอบกลับ User ID (ขึ้นต้นด้วย <span className="font-mono">U</span> ยาว 33 ตัวอักษร) คัดลอกมาวางในช่องด้านบน
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor={consentId} className="flex items-start gap-2.5 text-sm text-slate-800">
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsent(e.target.checked)}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? `${consentId}-err` : undefined}
            className="mt-1 h-4 w-4 shrink-0 accent-steel-600"
          />
          <span>
            ยินยอมให้บันทึกอีเมล/LINE User ID นี้ในฐานข้อมูล เพื่อใช้ส่งการแจ้งเตือนทดสอบเท่านั้น
            <span className="block text-xs text-slate-600">
              {anyFilled ? "จำเป็นต้องติ๊กก่อนส่ง เพราะกรอกผู้รับไว้" : "จำเป็นเมื่อกรอกช่องใดช่องหนึ่ง"}
            </span>
          </span>
        </label>
        {errors.consent && (
          <p id={`${consentId}-err`} className="mt-1 text-xs text-red-700">
            {errors.consent}
          </p>
        )}
      </div>
    </fieldset>
  );
}
