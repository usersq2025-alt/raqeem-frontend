import { Suspense, type ReactNode } from "react";
import { StudentShell } from "@/components/StudentShell";

export default function StudentSectionLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <StudentShell>{children}</StudentShell>
    </Suspense>
  );
}
