const INBOX_LINKS: Record<string, string> = {
  "gmail.com": "https://mail.google.com/mail/u/0/#inbox",
  "googlemail.com": "https://mail.google.com/mail/u/0/#inbox",
  "outlook.com": "https://outlook.live.com/mail/0/inbox",
  "hotmail.com": "https://outlook.live.com/mail/0/inbox",
  "live.com": "https://outlook.live.com/mail/0/inbox",
  "msn.com": "https://outlook.live.com/mail/0/inbox",
  "yahoo.com": "https://mail.yahoo.com/",
  "icloud.com": "https://www.icloud.com/mail",
  "me.com": "https://www.icloud.com/mail",
};

export function inboxUrlForEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return null;
  return INBOX_LINKS[domain] ?? `https://${domain}`;
}
