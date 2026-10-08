export type ExhibitionSession = {
  student_id: number;
  grade_level: number | null;
  profession_code: string | null;
  gender: "male" | "female" | null;
  points_balance: number;
};

export type ExhibitionProfession = { id: number; code: string; name_ar: string; name_en: string };

export type ExhibitionSessionState = {
  session: ExhibitionSession | null;
  professions: ExhibitionProfession[];
};

export const EXHIBITION_STUDENT_NAME = "طالب المعرض";

export const GRADE_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];

export class ExhibitionSessionError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export async function loadExhibitionSession(): Promise<ExhibitionSessionState> {
  const response = await fetch("/api/parent/exhibition/session", { cache: "no-store" });
  if (!response.ok) throw new ExhibitionSessionError(response.status);
  return (await response.json()) as ExhibitionSessionState;
}

export async function startExhibitionSession(input: {
  professionCode: string;
  gradeLevel: number;
  gender: "male" | "female";
  fresh: boolean;
}): Promise<ExhibitionSession> {
  const response = await fetch("/api/parent/exhibition/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      profession_code: input.professionCode,
      grade_level: input.gradeLevel,
      gender: input.gender,
      fresh: input.fresh,
    }),
  });
  if (!response.ok) throw new ExhibitionSessionError(response.status);
  return (await response.json()) as ExhibitionSession;
}