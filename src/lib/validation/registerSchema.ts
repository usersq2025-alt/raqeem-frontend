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

export type PasswordRuleId = "length" | "lower" | "upper" | "digit";

export function getPasswordRules(password: string): Record<PasswordRuleId, boolean> {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
}

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  const rules = getPasswordRules(password);
  const met = [rules.length, rules.lower && rules.upper, rules.digit].filter(Boolean).length;
  return met as 0 | 1 | 2 | 3;
}

export function isPasswordStrong(password: string): boolean {
  const rules = getPasswordRules(password);
  return rules.length && rules.lower && rules.upper && rules.digit;
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
