export const GRADE_IDS = [1, 2, 3, 4, 5, 6] as const;

export type GradeId = (typeof GRADE_IDS)[number];

export function isGradeId(value: number): value is GradeId {
  return (GRADE_IDS as readonly number[]).includes(value);
}
