/** ปิดบังอีเมลบางส่วน: hero@gmail.com → he***@gmail.com */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  return `${local.slice(0, Math.min(2, local.length - 1) || 1)}***${email.slice(at)}`;
}

/** ปิดบัง LINE User ID: U4af4980629...3c2f → U4af…3c2f */
export function maskLineUserId(id: string | null): string | null {
  if (!id) return null;
  if (id.length <= 8) return "U…";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
