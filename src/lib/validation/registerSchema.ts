import { z } from "zod";

/** Allows letters, spaces, hyphen and apostrophe for compound names (e.g. Al-Said, O'Neil). */
export const NAME_PATTERN = /^[\p{L} '-]+$/u;
export const PHONE_DIGITS_PATTERN = /^\d{6,12}$/;

/**
 * Practical mailbox: local@domain.tld
 * Requires @, a real host, and a alphabetic TLD (.com / .net / …).
 */
export const EMAIL_PATTERN =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 190) return false;
  if (/\s/.test(email)) return false;
  if (!email.includes("@")) return false;
  if (email.includes("..")) return false;
  if (email.startsWith(".") || email.endsWith(".")) return false;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return false;
  const domain = email.slice(at + 1);
  if (!domain.includes(".")) return false;
  return EMAIL_PATTERN.test(email);
}

/** Only length is enforced -- parents can use whatever characters (including Arabic)
 * are easiest for them to remember. */
export type PasswordRuleId = "length";

export function getPasswordRules(password: string): Record<PasswordRuleId, boolean> {
  return {
    length: password.length >= 8,
  };
}

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 8) return 0;
  if (password.length >= 16) return 3;
  if (password.length >= 12) return 2;
  return 1;
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordRules(password).length;
}

type SchemaMessages = {
  nameRequired: string;
  nameLetters: string;
  nameLength: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordRules: string;
  termsRequired: string;
};

function emailField(messages: Pick<SchemaMessages, "emailRequired" | "emailInvalid">) {
  return z
    .string()
    .trim()
    .min(1, messages.emailRequired)
    .refine(isValidEmail, messages.emailInvalid);
}

export function createRegisterSchema(messages: SchemaMessages) {
  return z.object({
    fullName: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .min(3, messages.nameLength)
      .max(60, messages.nameLength)
      .regex(NAME_PATTERN, messages.nameLetters),
    email: emailField(messages),
    password: z
      .string()
      .min(1, messages.passwordRequired)
      .refine(isPasswordStrong, messages.passwordRules),
    acceptedTerms: z.boolean().refine((value) => value === true, messages.termsRequired),
  });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
