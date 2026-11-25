import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth-config";
import { createAuthClient } from "@/lib/auth";

/** Google → Supabase ส่งกลับมาที่นี่พร้อม ?code= แล้วแลกเป็น session (เก็บใน cookie) */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createAuthClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: new Error("config") };
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("[auth/callback]", error);
  }
  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
