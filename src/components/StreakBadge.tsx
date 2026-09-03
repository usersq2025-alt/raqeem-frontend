"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  days: number;
  isActiveToday: boolean;
  href?: string;
};

export function StreakBadge({ days, isActiveToday, href }: Props) {
  const t = useTranslations("student.streak");
  const className = `inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-xs font-extrabold shadow-[0_6px_16px_-10px_rgba(26,43,71,0.45)] ${
    isActiveToday ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-100 text-text-gray"
  }`;
  const content = (
    <>
      <span className={isActiveToday ? "streak-flame-lit" : "streak-flame-dim"} aria-hidden="true">
        <FlameIcon lit={isActiveToday} />
      </span>
      <span>{t("days", { count: days })}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={t("open")}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function FlameIcon({ lit }: { lit: boolean }) {
  if (!lit) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 3c1.8 3.2-.2 5.1-1.4 6.6C9.2 11.3 8.4 12.4 8.4 14.2c0 2.4 1.8 4.4 3.6 4.4s3.6-2 3.6-4.4c0-1.3-.5-2.3-1.2-3.3"
          stroke="#9CA3AF"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M12 13.2c.7.6 1.1 1.3 1.1 2.1 0 1.1-.8 1.9-1.1 1.9" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 2.8c2.2 3.6.3 5.6-1.1 7.3-1.5 1.8-2.4 3.1-2.4 5.2 0 2.8 2.2 5 4.5 5s4.5-2.2 4.5-5c0-1.6-.7-2.9-1.6-4.2"
        fill="#FF8A3D"
      />
      <path d="M12 12.8c1 .8 1.6 1.7 1.6 2.8 0 1.5-1.1 2.6-1.6 2.6" fill="#FFE27A" />
    </svg>
  );
}
