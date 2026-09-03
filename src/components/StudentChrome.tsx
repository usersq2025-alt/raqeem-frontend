"use client";

import { createContext, useContext } from "react";
import type { ChildProfile } from "@/lib/api/children";
import type { StudentStreak } from "@/lib/api/student";

export type StudentChromeValue = {
  childId: number;
  child: ChildProfile | null;
  streak: StudentStreak | null;
  points: number | null;
  setPoints: (value: number) => void;
};

const StudentChromeContext = createContext<StudentChromeValue | null>(null);

export function StudentChromeProvider({
  value,
  children,
}: {
  value: StudentChromeValue;
  children: React.ReactNode;
}) {
  return <StudentChromeContext.Provider value={value}>{children}</StudentChromeContext.Provider>;
}

export function useStudentChrome(): StudentChromeValue | null {
  return useContext(StudentChromeContext);
}
