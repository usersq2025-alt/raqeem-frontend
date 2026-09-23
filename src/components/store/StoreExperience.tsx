"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/ProductCard";
import { PurchaseConfirmModal } from "@/components/store/PurchaseConfirmModal";
import { PointsPill } from "@/components/store/PointsPill";
import { useStudentChrome } from "@/components/StudentChrome";
import { withChildQuery } from "@/lib/config/subjects";
import { storePathForProfession, storePathIndex } from "@/lib/config/storeProgression";
import {
  getStagesForProfession,
  stageHasAssets,
} from "@/lib/config/headquartersStages";
import {
  purchaseItem,
  StoreApiError,
  type StoreCatalog,
  type StoreCatalogItem,
} from "@/lib/api/store";
import { startViewTransition } from "@/lib/utils/viewTransition";

type Props = {
  childId: number;
  catalog: StoreCatalog;
  professionCode?: string | null;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function flyItemThen(imageEl: HTMLElement | null, then: () => void) {
  if (!imageEl || prefersReducedMotion()) {
    then();
    return;
  }

  const rect = imageEl.getBoundingClientRect();
  const clone = imageEl.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.zIndex = "80";
  clone.style.pointerEvents = "none";
  clone.style.margin = "0";
  clone.style.transition = "transform 0.62s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.62s ease";
  document.body.appendChild(clone);

  const destX = window.innerWidth / 2 - rect.width / 2;
  const destY = window.innerHeight * 0.34;
  window.requestAnimationFrame(() => {
    clone.style.transform = `translate(${destX - rect.left}px, ${destY - rect.top}px) scale(1.18)`;
    clone.style.opacity = "0.2";
  });

  await new Promise((resolve) => window.setTimeout(resolve, 580));
  clone.remove();
  then();
}

export function StoreExperience({ childId, catalog, professionCode = null }: Props) {
  const t = useTranslations("student.store");
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;
  const router = useRouter();
  const [balance, setBalance] = useState(catalog.pointsBalance);
  const [items, setItems] = useState(catalog.items);
  const [selected, setSelected] = useState<StoreCatalogItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flySource = useRef<HTMLElement | null>(null);

  const path = useMemo(() => storePathForProfession(professionCode), [professionCode]);

  const readySlotKeys = useMemo(() => {
    const stages = getStagesForProfession(professionCode);
    const keys = new Set<string>();
    for (const stage of stages) {
      if (stage.stage > 0 && stage.storeSlotKey && stageHasAssets(stage)) {
        keys.add(stage.storeSlotKey);
      }
    }
    return keys;
  }, [professionCode]);

  const visible = useMemo(() => {
    let list = [...items];
    if (path.length > 0) {
      list = list.filter((item) => {
        if (item.isOwned) return true;
        if (!item.slotKey) return false;
        // Prefer asset-ready stages (uploaded images). If sync has none yet, show path items.
        if (readySlotKeys.size === 0) return path.includes(item.slotKey);
        return readySlotKeys.has(item.slotKey);
      });
      return list.sort(
        (a, b) => storePathIndex(path, a.slotKey) - storePathIndex(path, b.slotKey)
      );
    }
    return list;
  }, [items, path, readySlotKeys]);

  useEffect(() => {
    setChromePoints?.(balance);
  }, [balance, setChromePoints]);

  function openBuy(item: StoreCatalogItem, imageEl: HTMLElement | null) {
    if (item.isOwned || item.isLocked || !item.canPurchase) return;
    setError(null);
    flySource.current = imageEl;
    setSelected(item);
  }

  async function confirmBuy() {
    if (!selected || submitting) return;
    if (selected.isOwned || selected.isLocked || !selected.canPurchase) {
      setSelected(null);
      return;
    }
    setSubmitting(true);
    setError(null);
    const fromBalance = balance;
    try {
      const result = await purchaseItem(childId, selected.id);
      const item = selected;
      setSelected(null);
      chrome?.setPoints(result.pointsBalance);
      await flyItemThen(flySource.current, () => {
        startViewTransition(() => {
          router.push(
            withChildQuery(
              `/headquarters?highlight=${item.id}&fromBalance=${fromBalance}&toBalance=${result.pointsBalance}`,
              childId
            )
          );
        });
      });
    } catch (caught) {
      setSelected(null);
      setSubmitting(false);
      const status = caught instanceof StoreApiError ? caught.status : 500;
      setError(status === 409 ? t("alreadyOwned") : status === 422 ? t("itemLocked") : t("purchaseFailed"));
      try {
        const fresh = await (await import("@/lib/api/store")).getStoreItems(childId);
        setBalance(fresh.pointsBalance);
        setItems(fresh.items);
      } catch {
        /* keep current catalog */
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl xl:grid xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start xl:gap-7">
      <header className="mb-4 flex items-center justify-between gap-3 md:hidden" dir="ltr">
        <Image
          src="/images/brand/logo.png"
          alt=""
          width={1012}
          height={551}
          className="h-11 w-auto object-contain"
          priority
        />
        <PointsPill count={balance} label={t("pointsUnit")} />
      </header>

      <div>
        <div className="mb-5 md:flex md:items-center md:justify-between md:gap-4 xl:block">
          <div>
            <h1 className="sr-only text-2xl font-extrabold text-text-navy md:not-sr-only">{t("title")}</h1>
            <p className="mt-1.5 hidden text-sm font-bold leading-relaxed text-text-gray md:block">{t("pathHint")}</p>
          </div>
          <div className="hidden shrink-0 md:block xl:hidden">
            <PointsPill count={balance} label={t("pointsUnit")} />
          </div>
        </div>
        <p className="mb-4 text-sm font-bold text-text-gray md:hidden">{t("pathHint")}</p>

        {error ? (
          <p
            className="login-error-enter mb-3 rounded-2xl bg-[#FDECEC] px-3 py-2 text-center text-sm font-bold text-[#C62828]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="py-16 text-center text-base font-bold text-text-gray">{t("emptyTab")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 md:gap-4 2xl:grid-cols-4">
            {visible.map((item, index) => (
              <ProductCard key={item.id} item={item} index={index} onBuy={openBuy} />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden flex-col gap-4 xl:flex">
        <section className="rounded-[24px] bg-white p-4 shadow-[0_14px_32px_-22px_rgba(26,43,71,0.4)]">
          <h2 className="text-sm font-extrabold text-text-navy">{t("title")}</h2>
          <div className="mt-3">
            <PointsPill count={balance} label={t("pointsUnit")} />
          </div>
          <p className="mt-3 text-xs font-bold leading-relaxed text-text-gray">{t("pathHint")}</p>
        </section>
      </aside>

      <PurchaseConfirmModal
        open={Boolean(selected)}
        item={selected}
        currentBalance={balance}
        submitting={submitting}
        onConfirm={() => void confirmBuy()}
        onCancel={() => {
          if (!submitting) setSelected(null);
        }}
      />
    </div>
  );
}
