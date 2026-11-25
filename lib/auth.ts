import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getAuthConfig, isMockModeEnv } from "./auth-config";

export type Role = "ADMIN" | "USER";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** ADMIN = อีเมลอยู่ใน ADMIN_EMAILS, คนอื่นทั้งหมด = USER */
  role: Role;
}

/** อีเมล ADMIN จาก env ADMIN_EMAILS (คั่นด้วย comma, ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function roleFor(email: string | null): Role {
  return email && adminEmails().has(email.toLowerCase()) ? "ADMIN" : "USER";
}

/** ผู้ใช้จำลองในโหมดข้อมูลจำลอง (ไม่เชื่อมต่อ Supabase จึง login จริงไม่ได้) */
const MOCK_USER: CurrentUser = { id: "mock-user", email: null, name: "โหมดข้อมูลจำลอง", avatarUrl: null, role: "USER" };

/** Supabase client ที่อ่าน/เขียน session จาก cookie — สร้างใหม่ทุก request ห้ามแชร์ */
export async function createAuthClient() {
  const cfg = getAuthConfig();
  if (!cfg) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component เขียน cookie ไม่ได้ — proxy.ts เป็นตัว refresh session ให้แล้ว
        }
      },
    },
  });
}

/** ผู้ใช้ที่ login อยู่ (ตรวจ JWT แล้ว) หรือ null */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isMockModeEnv()) return MOCK_USER;
  // Supabase เรียก Date.now() ตอนตรวจ token → บอก Next ว่าเป็นข้อมูลต่อ request (ห้าม prerender)
  // ใส่ไว้ที่นี่ที่เดียว ผู้เรียกทุกที่จึงไม่ต้องจำเอง
  await connection();
  const supabase = await createAuthClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub) return null;
  const meta = (c.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  const email = str(c.email);
  return {
    id: c.sub,
    email,
    name: str(meta.full_name) ?? str(meta.name),
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
    role: roleFor(email),
  };
}
