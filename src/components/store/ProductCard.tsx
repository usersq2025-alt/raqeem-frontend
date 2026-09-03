"use client";

import { useTranslations } from "next-intl";
import { productCardState, type StoreCatalogItem } from "@/lib/api/store";

type Props = {
  item: StoreCatalogItem;
  index: number;
  onBuy: (item: StoreCatalogItem, imageEl: HTMLElement | null) => void;
};

export function ProductCard({ item, index, onBuy }: Props) {
  const t = useTranslations("student.store");
  const state = productCardState(item);
  const displayName = item.slotKey ? t(`items.${item.slotKey}`) : (item.name ?? "");
  const transitionName = item.slotKey ? `store-item-${item.slotKey}` : `store-item-${item.id}`;

  if (state === "hidden") {
    return (
      <article
        className="store-card relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-[22px] bg-white p-3"
        style={{ animationDelay: `${index * 55}ms` }}
      >
        <LockBadge />
        <div className="relative mx-auto mt-2 flex h-[5.6rem] w-[5.6rem] items-center justify-center">
          <span className="store-silhouette h-[4.8rem] w-[4.8rem]" aria-hidden="true" />
        </div>
        <p className="mt-auto px-1 pb-1 text-center text-[12px] font-bold leading-snug text-text-gray">{t("hiddenHint")}</p>
      </article>
    );
  }

  return (
    <article
      className="store-card relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-[22px] bg-white p-3"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {state === "locked" ? <LockBadge /> : null}
      <div
        className="relative mx-auto mt-1 flex h-[6.6rem] w-[6.6rem] items-center justify-center"
        style={{ viewTransitionName: transitionName }}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-contain"
            data-store-item-image={item.id}
          />
        ) : (
          <span className="text-4xl" aria-hidden="true">
            🎁
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-center text-[13px] font-extrabold leading-snug text-text-navy sm:text-sm">
        {displayName}
      </h3>
      {state === "locked" ? (
        <p className="mt-auto pb-1 text-center text-[12px] font-extrabold text-[#E23D3D]">{t("soon")}</p>
      ) : (
        <div className="mt-auto flex flex-col items-center gap-1.5 pt-2">
          <p className={`text-sm font-extrabold ${state === "insufficient" ? "text-[#BDBDBD]" : "text-text-navy"}`}>
            <span className="tabular-nums">{item.pricePoints}</span>
          </p>
          <button
            type="button"
            disabled={state !== "available"}
            onClick={(event) => {
              const card = event.currentTarget.closest("article");
              const imageEl = card?.querySelector("[data-store-item-image]") as HTMLElement | null;
              onBuy(item, imageEl);
            }}
            className={
              state === "available"
                ? "w-full rounded-xl bg-primary-orange px-3 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#D9651A] transition active:translate-y-0.5 active:shadow-none"
                : "w-full cursor-not-allowed rounded-xl bg-[#D9D9D9] px-3 py-2 text-sm font-extrabold text-white"
            }
          >
            {t("buy")}
          </button>
        </div>
      )}
    </article>
  );
}

function LockBadge() {
  return (
    <span className="absolute start-2.5 top-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3A3A3A] text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <path
          d="M8 11V8.2A4 4 0 0 1 12 4a4 4 0 0 1 4 4.2V11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect x="6" y="11" width="12" height="9" rx="2.2" fill="currentColor" />
      </svg>
    </span>
  );
}
