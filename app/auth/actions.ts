"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig, safeNextPath } from "@/lib/auth-config";
import { createAuthClient } from "@/lib/auth";

/** origin ของเว็บจาก request (รองรับ Vercel/reverse proxy ผ่าน x-forwarded-*) */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  if (!getAuthConfig()) redirect("/login?error=config");
  const supabase = await createAuthClient();
  if (!supabase) redirect("/login?error=config");

  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const redirectTo = `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) {
    console.error("[auth] signInWithOAuth", error);
    redirect("/login?error=oauth");
  }
  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase?.auth.signOut();
  redirect("/login");
}
