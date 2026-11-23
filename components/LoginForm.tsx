"use client";

import { useActionState } from "react";
import { LoaderCircle, Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/app/test/actions";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <label htmlFor="test-password" className="mb-1 block text-xs font-medium text-slate-700">
          รหัสผ่าน
        </label>
        <div className="relative">
          <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" strokeWidth={1.75} />
          <input
            id="test-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            autoFocus
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "login-error" : undefined}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pr-2.5 pl-8 text-sm text-slate-900 aria-[invalid=true]:border-red-500"
          />
        </div>
        {state.error && (
          <p id="login-error" role="alert" className="mt-1.5 text-xs text-red-700">
            {state.error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-steel-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-steel-700 disabled:bg-steel-600/60"
      >
        {pending && <LoaderCircle aria-hidden className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.75} />}
        เข้าสู่ระบบ
      </button>
    </form>
  );
}
