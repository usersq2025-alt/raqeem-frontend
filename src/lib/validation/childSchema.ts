import { isGradeId } from "@/lib/config/grades";
import { NAME_PATTERN } from "@/lib/validation/registerSchema";
import { z } from "zod";

export const CHILD_MIN_AGE = 4;
export const CHILD_MAX_AGE = 18;

type ChildSchemaMessages = {
  nameRequired: string;
  nameLetters: string;
  nameLength: string;
  birthRequired: string;
  birthInvalid: string;
  gradeRequired: string;
  genderRequired: string;
};

export function birthDateBounds(now = new Date()) {
  const max = new Date(now.getFullYear() - CHILD_MIN_AGE, now.getMonth(), now.getDate());
  const min = new Date(now.getFullYear() - CHILD_MAX_AGE, now.getMonth(), now.getDate());
  return { min, max };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function birthDateInputBounds(now = new Date()) {
  const { min, max } = birthDateBounds(now);
  return { min: toIsoDate(min), max: toIsoDate(max) };
}

export function createChildSchema(messages: ChildSchemaMessages) {
  const { min, max } = birthDateBounds();

  return z.object({
    fullName: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .min(2, messages.nameLength)
      .max(40, messages.nameLength)
      .regex(NAME_PATTERN, messages.nameLetters),
    birthDate: z
      .string()
      .min(1, messages.birthRequired)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date >= min && date <= max;
      }, messages.birthInvalid),
    gradeId: z
      .number({ error: messages.gradeRequired })
      .refine((value) => isGradeId(value), messages.gradeRequired),
    gender: z.enum(["male", "female"], { error: messages.genderRequired }),
  });
}

export type ChildFormValues = z.infer<ReturnType<typeof createChildSchema>>;
