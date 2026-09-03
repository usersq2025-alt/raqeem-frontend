export type CharacterGender = "male" | "female";

const KNOWN_PROFESSION_CODES = [
  "doctor",
  "engineer",
  "teacher",
  "chef",
  "astronaut",
  "soldier",
] as const;

export type ProfessionCode = (typeof KNOWN_PROFESSION_CODES)[number];

export const PROFESSION_ID_TO_CODE: Record<number, ProfessionCode> = {
  1: "doctor",
  2: "engineer",
  3: "teacher",
  4: "chef",
  5: "astronaut",
  6: "soldier",
};

export function professionCodeFromId(id: number | null): ProfessionCode | null {
  if (id == null) return null;
  return PROFESSION_ID_TO_CODE[id] ?? null;
}

export function professionAvatarSrc(
  code: string | null | undefined,
  gender: CharacterGender | null | undefined = "male"
): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  const folder = gender === "female" ? "female" : "male";
  return `/images/professions/${folder}/${normalized}.png?v=4`;
}
