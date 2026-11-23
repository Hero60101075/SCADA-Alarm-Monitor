import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client ฝั่ง server เท่านั้น ใช้ service role key (bypass RLS)
 * - ไฟล์นี้ import "server-only" → ถ้ามี client component import เข้าไป build จะล้มทันที
 * - ห้ามตั้งชื่อ env ด้วย NEXT_PUBLIC_
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

type KeyKind = "secret" | "legacy-jwt";

function decodeJwtRole(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && "role" in parsed) {
      const role = (parsed as { role: unknown }).role;
      return typeof role === "string" ? role : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** รองรับ key 2 แบบ: sb_secret_... (แบบใหม่) และ legacy JWT ที่ role = service_role */
function classifyKey(key: string): KeyKind {
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) {
    throw new ConfigError(
      "SUPABASE_SERVICE_ROLE_KEY เป็น publishable key ซึ่งอ่านข้อมูลไม่ได้เพราะเปิด RLS ไว้ — ต้องใช้ secret key (sb_secret_...) หรือ service_role JWT",
    );
  }
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) {
    const role = decodeJwtRole(key);
    if (role !== "service_role") {
      throw new ConfigError(
        `SUPABASE_SERVICE_ROLE_KEY เป็น JWT ที่ role = "${role ?? "ไม่ทราบ"}" — ต้องเป็น service_role (anon key ใช้ไม่ได้เพราะเปิด RLS ไว้)`,
      );
    }
    return "legacy-jwt";
  }
  throw new ConfigError(
    "รูปแบบ SUPABASE_SERVICE_ROLE_KEY ไม่ถูกต้อง — ต้องขึ้นต้นด้วย sb_secret_ หรือเป็น legacy JWT (eyJ...)",
  );
}

let cached: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (cached) return cached;

  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!rawUrl) throw new ConfigError("ยังไม่ได้ตั้งค่า SUPABASE_URL ใน .env.local");
  if (!key) throw new ConfigError("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  let url: string;
  try {
    // supabase-js เติม /rest/v1 เอง จึงใช้แค่ origin (กันกรณีวาง URL ที่มี /rest/v1/ ต่อท้าย → PGRST125)
    url = new URL(rawUrl).origin;
  } catch {
    throw new ConfigError("SUPABASE_URL ไม่ใช่ URL ที่ถูกต้อง");
  }
  classifyKey(key);

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA?.trim().toLowerCase() === "true";
}
