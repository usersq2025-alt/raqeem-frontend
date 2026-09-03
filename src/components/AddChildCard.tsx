"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AddChildCard({ variant }: { variant: "tile" | "bar" }) {
  const t = useTranslations("hub");

  const inner = (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-orange text-2xl font-black text-white shadow-[0_6px_0_#D9651A] transition-transform duration-150 group-hover:scale-105 group-active:translate-y-0.5">
        +
      </span>
      <span className="text-base font-extrabold text-text-navy">{t("addChild")}</span>
    </>
  );

  if (variant === "bar") {
    return (
      <Link
        href="/add-child"
        className="group flex w-full items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-primary-orange/55 bg-white px-4 py-4 transition-[border-color,background-color,transform] duration-200 hover:border-primary-orange hover:bg-orange-50/70 active:scale-[0.98]"
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link
      href="/add-child"
      className="hub-card group flex w-[min(72vw,17.5rem)] shrink-0 flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-primary-orange/55 bg-white px-5 py-10 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-1 hover:border-primary-orange hover:bg-orange-50/70 active:scale-[0.96]"
    >
      {inner}
    </Link>
  );
}
