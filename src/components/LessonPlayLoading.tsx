"use client";

import { useTranslations } from "next-intl";

/** Child-friendly animated wait state while the lesson attempt boots. */
export function LessonPlayLoading() {
  const t = useTranslations("lesson");

  return (
    <div className="play-loading flex min-h-[70vh] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="play-loading-track relative mb-8 h-36 w-full max-w-xs" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 140" fill="none">
          <path
            d="M20 110 C 50 40, 90 120, 120 55 S 170 30, 185 70"
            stroke="#D5DCE6"
            strokeWidth="10"
            strokeLinecap="round"
            className="play-loading-path"
          />
          <path
            d="M20 110 C 50 40, 90 120, 120 55 S 170 30, 185 70"
            stroke="#2EC4A8"
            strokeWidth="8"
            strokeLinecap="round"
            className="play-loading-path-live"
          />
        </svg>
        <span className="play-loading-node play-loading-node-a" />
        <span className="play-loading-node play-loading-node-b" />
        <span className="play-loading-node play-loading-node-c" />
        <span className="play-loading-star">★</span>
      </div>

      <p className="text-2xl font-black text-text-navy">{t("loadingTitle")}</p>
      <p className="mt-2 max-w-xs text-sm font-bold leading-relaxed text-text-gray">{t("loadingBody")}</p>
      <div className="mt-5 flex gap-1.5" aria-hidden="true">
        <span className="play-loading-dot" />
        <span className="play-loading-dot play-loading-dot-2" />
        <span className="play-loading-dot play-loading-dot-3" />
      </div>
    </div>
  );
}
