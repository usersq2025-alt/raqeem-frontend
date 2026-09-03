import { z } from "zod";

/** Allows letters, spaces, hyphen and apostrophe for compound names (e.g. Al-Said, O'Neil). */
export const NAME_PATTERN = /^[\p{L} '-]+$/u;
export const PHONE_DIGITS_PATTERN = /^\d{6,12}$/;

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;

  const hasLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const met = [hasLength, hasLower && hasUpper, hasDigit].filter(Boolean).length;

  return met as 0 | 1 | 2 | 3;
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordStrength(password) === 3;
}

type SchemaMessages = {
  nameRequired: string;
  nameLetters: string;
  nameLength: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordRules: string;
  confirmRequired: string;
  confirmMismatch: string;
  termsRequired: string;
  phoneInvalid: string;
};

function emailField(messages: Pick<SchemaMessages, "emailRequired" | "emailInvalid">) {
  return z
    .string()
    .trim()
    .min(1, messages.emailRequired)
    .email(messages.emailInvalid);
}

export function createRegisterSchema(messages: SchemaMessages) {
  return z
    .object({
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
      confirmPassword: z.string().min(1, messages.confirmRequired),
      phoneCountry: z.string(),
      phoneNumber: z
        .string()
        .trim()
        .refine(
          (value) =>
            value === "" || PHONE_DIGITS_PATTERN.test(value.replace(/\s+/g, "")),
          messages.phoneInvalid
        ),
      acceptedTerms: z
        .boolean()
        .refine((value) => value === true, messages.termsRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.confirmMismatch,
      path: ["confirmPassword"],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
