import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = {
  backHref?: ComponentProps<typeof Link>["href"];
  backLabel?: string;
  hideBack?: boolean;
  alwaysShowBack?: boolean;
  celebration?: boolean;
  children: ReactNode;
};

export function AuthShell({
  backHref,
  backLabel,
  hideBack = false,
  alwaysShowBack = false,
  celebration = false,
  children,
}: Props) {
  const showBack = !hideBack && backHref && backLabel;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-white">
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
        <div className="absolute -start-24 top-10 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl" />
        <div className="absolute -end-16 top-32 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute bottom-10 start-1/3 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -end-10 bottom-0 h-56 w-56 rounded-full bg-orange-100/70 blur-3xl" />
      </div>

      {celebration ? <CelebrationScatter /> : null}

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-5 md:max-w-none md:items-center md:justify-center md:px-6 md:py-10">
        <article className={`relative w-full md:rounded-[28px] md:bg-white md:p-8 md:shadow-[0_20px_60px_-24px_rgba(26,43,71,0.25)] ${celebration ? "md:max-w-[460px]" : "md:max-w-[440px]"}`}>
          <div className="relative mb-5 flex items-center justify-center">
            {showBack ? (
              <Link
                href={backHref}
                className={`absolute start-0 flex h-10 w-10 items-center justify-center rounded-full text-text-navy hover:bg-neutral-100 ${alwaysShowBack ? "" : "md:hidden"}`}
                aria-label={backLabel}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
                  <path
                    d="M15 5 8 12l7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            ) : null}
            <BrandLogo size="sm" />
            <div className="absolute end-0">
              <LanguageSwitcher />
            </div>
          </div>
          {children}
        </article>
      </div>
    </div>
  );
}

function CelebrationScatter() {
  const pieces = [
    { className: "start-[8%] top-[12%] h-2.5 w-2.5 rotate-12 bg-pink-300", round: true },
    { className: "end-[10%] top-[18%] h-2 w-3.5 rotate-[28deg] bg-sky-300", round: false },
    { className: "start-[14%] top-[38%] h-2 w-2 rotate-45 bg-amber-300", round: false },
    { className: "end-[16%] top-[42%] h-3 w-3 bg-violet-300", round: true },
    { className: "start-[6%] bottom-[22%] h-2 w-4 -rotate-12 bg-lime-300", round: false },
    { className: "end-[8%] bottom-[18%] h-2.5 w-2.5 bg-orange-200", round: true },
    { className: "start-1/2 top-[8%] h-2 w-2 -translate-x-1/2 rotate-[18deg] bg-yellow-300", round: false },
    { className: "end-[22%] bottom-[32%] h-2 w-2.5 rotate-[50deg] bg-pink-200", round: false },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden md:block" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.className}
          className={`absolute opacity-80 ${piece.round ? "rounded-full" : "rounded-[2px]"} ${piece.className}`}
        />
      ))}
    </div>
  );
}
