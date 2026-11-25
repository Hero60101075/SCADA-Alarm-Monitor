import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, isMockModeEnv, isPublicPath } from "@/lib/auth-config";

/**
 * ทุกหน้าต้อง login with Google ก่อน (ยกเว้น /login และ /auth/callback)
 * - refresh session ของ Supabase แล้วเขียน cookie กลับใน response
 * - โหมดข้อมูลจำลอง (USE_MOCK_DATA=true) ไม่เชื่อมต่อ Supabase จึงข้ามการ login
 * หมายเหตุ: Server Action / หน้าแต่ละหน้ายังตรวจผู้ใช้ซ้ำเองด้วย ไม่พึ่ง proxy อย่างเดียว
 */
export async function proxy(request: NextRequest) {
  if (isMockModeEnv()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const cfg = getAuthConfig();
  if (!cfg) {
    // ยังไม่ได้ตั้งค่า Auth → ปิดทุกหน้า ให้ /login แสดงข้อความบอกวิธีตั้งค่า
    return isPublicPath(pathname) ? NextResponse.next() : redirectToLogin(request, pathname + search);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // ต้องเรียกทุก request เพื่อ refresh token ที่ใกล้หมดอายุ
  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims?.sub;

  if (!loggedIn && !isPublicPath(pathname)) return redirectToLogin(request, pathname + search, response);
  if (loggedIn && pathname === "/login") return withCookies(NextResponse.redirect(new URL("/", request.url)), response);
  return response;
}

function redirectToLogin(request: NextRequest, next: string, carry?: NextResponse) {
  const url = new URL("/login", request.url);
  if (next !== "/") url.searchParams.set("next", next);
  const res = NextResponse.redirect(url);
  return carry ? withCookies(res, carry) : res;
}

/** คัดลอก cookie ที่ Supabase เพิ่ง refresh ไปยัง redirect response ด้วย ไม่งั้น session หลุด */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
