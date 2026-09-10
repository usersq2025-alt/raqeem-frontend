import Image from "next/image";
import { useTranslations } from "next-intl";
import { TRUST_AVATARS } from "@/config/welcome";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true">
      <path
        d="M10 1.8 12.4 7l5.6.5-4.2 3.7 1.3 5.5L10 13.8 4.9 16.7l1.3-5.5L2 7.5 7.6 7 10 1.8Z"
        fill={filled ? "#F8CD86" : "none"}
        stroke="#F48232"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrustRow() {
  const t = useTranslations("welcome");

  return (
    <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-2 md:max-w-none md:items-start">
      <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
        <div className="flex items-center ps-1">
          {TRUST_AVATARS.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={40}
              height={40}
              className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm sm:h-9 sm:w-9"
              style={{ marginInlineStart: index === 0 ? 0 : -10 }}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-text-navy">{t("trustLine")}</p>
      </div>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} filled={index < 4} />
        ))}
      </div>
    </div>
  );
}
