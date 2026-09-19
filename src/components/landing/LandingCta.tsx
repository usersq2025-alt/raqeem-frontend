import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowIcon, StarIcon } from "@/components/landing/LandingIcons";

type Props = {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  className?: string;
  icon?: "star" | "arrow";
};

export function LandingCta({ href, children, className, icon = "star" }: Props) {
  return (
    <Link href={href} className={["landing-cta", className].filter(Boolean).join(" ")}>
      {icon === "arrow" ? <ArrowIcon className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
      <span>{children}</span>
    </Link>
  );
}
