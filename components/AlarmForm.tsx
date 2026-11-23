"use client";

import { useEffect, useId, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TriangleExclamationPoint } from "lucide-react";
import { createAlarmAction } from "@/app/test/actions";
import { PRESETS } from "@/lib/presets";
import { POINT_TYPES } from "@/lib/types";
import { alarmFormSchema, toFieldErrors, type AlarmFormField, type AlarmFormInput, type FieldErrors } from "@/lib/validation";
import { AnalysisTracker } from "./AnalysisTracker";
import { ConfirmDialog } from "./ConfirmDialog";
import { RecipientFields } from "./RecipientFields";

const EMPTY: AlarmFormInput = {
  event_time: "",
  sub: "",
  point: "",
  point_type: "DI",
  value: "",
  low_th: "",
  high_th: "",
  notify_email: "",
  notify_line_user_id: "",
  consent: false,
};

/* ---------- จำผู้รับไว้ใน localStorage (ทุกการเข้าถึงห่อ try/catch) ---------- */

const STORAGE_KEY = "scada-test-recipients:v1";
type StoredRecipients = { notify_email: string; notify_line_user_id: string };

function readStored(): StoredRecipients | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const email = typeof o.notify_email === "string" ? o.notify_email.slice(0, 254) : "";
    const line = typeof o.notify_line_user_id === "string" ? o.notify_line_user_id.slice(0, 64) : "";
    return email || line ? { notify_email: email, notify_line_user_id: line } : null;
  } catch {
    return null;
  }
}

/** คืนค่า true ถ้ามีค่าถูกจำไว้หลังเขียน */
function writeStored(v: StoredRecipients): boolean {
  try {
    if (!v.notify_email.trim() && !v.notify_line_user_id.trim()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

function clearStored(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* เบราว์เซอร์ไม่อนุญาต storage — ไม่เป็นไร */
  }
}

const noopSubscribe = () => () => {};

const COOLDOWN_SEC = 10;

const inputCls =
  "h-9 w-full rounded-md border bg-white px-2.5 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50/40";

/** aside: เนื้อหาคอลัมน์ขวาบนจอกว้าง (เช่น รายการที่ทดสอบล่าสุด) — จอเล็กจะเรียงต่อด้านล่าง */
export function AlarmForm({ aside }: { aside?: ReactNode }) {
  const router = useRouter();
  const uid = useId();
  const [values, setValues] = useState<AlarmFormInput>(EMPTY);
  const [preset, setPreset] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);
  const [tracking, setTracking] = useState<{ id: string; run: number } | null>(null);
  const [hasStored, setHasStored] = useState(false);

  // โหลดค่าที่จำไว้ครั้งแรกบนเบราว์เซอร์ (หลัง hydrate) — ปรับ state ระหว่าง render แทน setState ใน effect
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [storageChecked, setStorageChecked] = useState(false);
  if (isClient && !storageChecked) {
    setStorageChecked(true);
    const stored = readStored();
    if (stored) {
      setValues((s) => ({ ...s, ...stored }));
      setHasStored(true);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const fid = (f: AlarmFormField) => `${uid}-${f}`;

  const set = (f: AlarmFormField, v: string) => {
    const next = { ...values, [f]: v } as AlarmFormInput;
    setValues(next);
    if (f === "notify_email" || f === "notify_line_user_id") {
      setHasStored(writeStored({ notify_email: next.notify_email, notify_line_user_id: next.notify_line_user_id }));
    }
    // low/high ตรวจร่วมกัน แก้ช่องใดช่องหนึ่งให้ล้าง error ของทั้งคู่
    const related: AlarmFormField[] = f === "low_th" || f === "high_th" ? ["low_th", "high_th"] : [f];
    if (related.some((k) => errors[k])) {
      setErrors((e) => {
        const next = { ...e };
        related.forEach((k) => delete next[k]);
        return next;
      });
    }
  };

  const applyPreset = (idx: string) => {
    setPreset(idx);
    if (idx === "") return;
    const p = PRESETS[Number(idx)];
    if (!p) return;
    // เติมเฉพาะข้อมูล alarm ไม่แตะผู้รับแจ้งเตือน
    setValues((s) => ({ ...s, ...p }));
    setErrors({});
    setFormError(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cooldown > 0 || isPending) return;
    const parsed = alarmFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = toFieldErrors(parsed.error);
      setErrors(fe);
      setFormError("กรุณาแก้ไขช่องที่มีข้อความแจ้งเตือน");
      const firstField = Object.keys(fe)[0] as AlarmFormField | undefined;
      if (firstField) document.getElementById(fid(firstField))?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setConfirmOpen(true);
  };

  const onConfirm = () => {
    startTransition(async () => {
      const res = await createAlarmAction(values);
      setConfirmOpen(false);
      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
        return;
      }
      setCooldown(COOLDOWN_SEC);
      // ต้องยินยอมใหม่ทุกครั้งที่ส่ง
      setValues((s) => ({ ...s, consent: false }));
      setTracking((t) => ({ id: res.id, run: (t?.run ?? 0) + 1 }));
      router.refresh();
    });
  };

  const summary = alarmFormSchema.safeParse(values);
  const blocked = cooldown > 0 || isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
      <section aria-labelledby="form-title" className="glass min-w-0 rounded-xl">
        <div className="flex flex-col gap-3 border-b border-slate-900/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="form-title" className="text-sm font-semibold text-slate-900">
            ข้อมูล alarm ทดสอบ
          </h2>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span className="shrink-0">เติมจาก preset</span>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
              className="h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 font-mono text-[12px] text-slate-900 sm:w-80 xl:w-72 2xl:w-80"
            >
              <option value="">— เลือก preset —</option>
              {PRESETS.map((p, i) => (
                <option key={i} value={i}>
                  {p.event_time} · {p.point_type} · {p.point}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-6">
            <Field label="เวลา (event_time)" id={fid("event_time")} error={errors.event_time} className="col-span-1 md:col-span-1">
              <input
                id={fid("event_time")}
                type="time"
                required
                value={values.event_time}
                onChange={(e) => set("event_time", e.target.value)}
                aria-invalid={!!errors.event_time}
                aria-describedby={errors.event_time ? `${fid("event_time")}-err` : undefined}
                className={`${inputCls} font-mono tnum`}
              />
            </Field>
            <Field label="สถานี (sub)" id={fid("sub")} error={errors.sub} className="col-span-1 md:col-span-1">
              <input
                id={fid("sub")}
                type="text"
                required
                autoComplete="off"
                maxLength={50}
                value={values.sub}
                onChange={(e) => set("sub", e.target.value)}
                aria-invalid={!!errors.sub}
                aria-describedby={errors.sub ? `${fid("sub")}-err` : undefined}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Point" id={fid("point")} error={errors.point} className="col-span-2 md:col-span-3">
              <input
                id={fid("point")}
                type="text"
                required
                autoComplete="off"
                maxLength={200}
                value={values.point}
                onChange={(e) => set("point", e.target.value)}
                aria-invalid={!!errors.point}
                aria-describedby={errors.point ? `${fid("point")}-err` : undefined}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Type" id={fid("point_type")} error={errors.point_type} className="col-span-1 md:col-span-1">
              <select
                id={fid("point_type")}
                value={values.point_type}
                onChange={(e) => set("point_type", e.target.value)}
                aria-invalid={!!errors.point_type}
                className={`${inputCls} font-mono`}
              >
                {POINT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Value" id={fid("value")} error={errors.value} className="col-span-1 md:col-span-2">
              <input
                id={fid("value")}
                type="text"
                inputMode="decimal"
                required
                autoComplete="off"
                value={values.value}
                onChange={(e) => set("value", e.target.value)}
                aria-invalid={!!errors.value}
                aria-describedby={errors.value ? `${fid("value")}-err` : undefined}
                className={`${inputCls} font-mono tnum`}
              />
            </Field>
            <Field label="Low threshold" hint="เว้นว่างได้" id={fid("low_th")} error={errors.low_th} className="col-span-1 md:col-span-2">
              <input
                id={fid("low_th")}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={values.low_th}
                onChange={(e) => set("low_th", e.target.value)}
                aria-invalid={!!errors.low_th}
                aria-describedby={errors.low_th ? `${fid("low_th")}-err` : undefined}
                className={`${inputCls} font-mono tnum`}
              />
            </Field>
            <Field label="High threshold" hint="เว้นว่างได้" id={fid("high_th")} error={errors.high_th} className="col-span-1 md:col-span-2">
              <input
                id={fid("high_th")}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={values.high_th}
                onChange={(e) => set("high_th", e.target.value)}
                aria-invalid={!!errors.high_th}
                aria-describedby={errors.high_th ? `${fid("high_th")}-err` : undefined}
                className={`${inputCls} font-mono tnum`}
              />
            </Field>
          </div>

          <RecipientFields
            idPrefix={uid}
            email={values.notify_email}
            lineUserId={values.notify_line_user_id}
            consent={values.consent}
            errors={errors}
            hasStored={hasStored}
            onChange={(f, v) => set(f, v)}
            onConsent={(checked) => {
              setValues((s) => ({ ...s, consent: checked }));
              if (errors.consent) setErrors((e) => ({ ...e, consent: undefined }));
            }}
            onClearStored={() => {
              clearStored();
              setHasStored(false);
              setValues((s) => ({ ...s, notify_email: "", notify_line_user_id: "", consent: false }));
              setErrors((e) => ({ ...e, notify_email: undefined, notify_line_user_id: undefined, consent: undefined }));
            }}
          />

          {formError && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-900/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                // ล้างเฉพาะข้อมูล alarm ผู้รับที่จำไว้ยังอยู่
                setValues((s) => ({ ...EMPTY, notify_email: s.notify_email, notify_line_user_id: s.notify_line_user_id }));
                setPreset("");
                setErrors({});
                setFormError(null);
              }}
              className="self-start rounded-md px-2.5 py-1.5 text-sm text-slate-700 transition-colors duration-150 hover:bg-white"
            >
              ล้างฟอร์ม
            </button>
            <div className="flex items-center gap-3">
              {cooldown > 0 && (
                <span className="text-xs text-slate-600 tnum" aria-live="polite">
                  ส่งได้อีกครั้งใน {cooldown} วินาที
                </span>
              )}
              <button
                type="submit"
                disabled={blocked}
                className="w-full rounded-md bg-steel-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-steel-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                ส่ง alarm ทดสอบ…
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="min-w-0 space-y-4">
        {tracking && (
          <AnalysisTracker key={`${tracking.id}-${tracking.run}`} id={tracking.id} onSettled={() => router.refresh()} />
        )}
        {aside}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันการส่ง alarm ทดสอบ"
        confirmLabel={isPending ? "กำลังส่ง…" : "ยืนยันส่งจริง"}
        pending={isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
      >
        {summary.success && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5 text-sm">
            <dt className="text-slate-600">เวลา</dt>
            <dd className="font-mono tnum">{summary.data.event_time}</dd>
            <dt className="text-slate-600">สถานี</dt>
            <dd className="font-mono">{summary.data.sub}</dd>
            <dt className="text-slate-600">Point</dt>
            <dd className="font-mono break-words">{summary.data.point}</dd>
            <dt className="text-slate-600">Type</dt>
            <dd className="font-mono">{summary.data.point_type}</dd>
            <dt className="text-slate-600">Value</dt>
            <dd className="font-mono tnum">{summary.data.value}</dd>
            <dt className="text-slate-600">Low / High</dt>
            <dd className="font-mono tnum">
              {summary.data.low_th ?? "null"} / {summary.data.high_th ?? "null"}
            </dd>
            <dt className="text-slate-600">ผู้รับ Gmail</dt>
            <dd className="font-mono break-all">{summary.data.notify_email ?? <span className="font-sans text-slate-600">ค่าเริ่มต้นของทีม</span>}</dd>
            <dt className="text-slate-600">ผู้รับ LINE</dt>
            <dd className="font-mono break-all">
              {summary.data.notify_line_user_id ?? <span className="font-sans text-slate-600">ค่าเริ่มต้นของทีม</span>}
            </dd>
          </dl>
        )}
        <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-amber-950">
          <TriangleExclamationPoint aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.75} />
          <p>
            การส่งครั้งนี้จะเรียก Make และ AI จริง เสีย credit/token ทุกครั้ง
            และถ้าผลเป็น <strong className="font-semibold">CRITICAL</strong> ระบบจะส่ง Gmail และ LINE ถึงผู้รับจริง
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Field({
  label,
  hint,
  id,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-xs font-medium text-slate-700">
        {label}
        {hint && <span className="font-normal text-slate-500">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
