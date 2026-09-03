export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return "***";
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visibleCount = Math.min(3, local.length);
  const visible = local.slice(0, visibleCount);

  return `${visible}***@${domain}`;
}
