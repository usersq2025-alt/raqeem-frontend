import type { Metadata } from "next";
import { ExhibitionLauncher } from "@/components/exhibition/ExhibitionLauncher";

export const metadata: Metadata = {
  title: "جرّب رقيم كطالب",
  robots: { index: false, follow: false },
};

// Public, unlisted trial entry: no login. The launcher mints a throwaway visitor account on start.
export default function DemoPage() {
  return <ExhibitionLauncher publicEntry />;
}
