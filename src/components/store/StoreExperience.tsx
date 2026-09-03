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
import { purchaseItem, StoreApiError, type StoreCatalog, type StoreCatalogItem, type StoreCategory } from "@/lib/api/store";
import { startViewTransition } from "@/lib/utils/viewTransition";

type Props = {
  childId: number;
  catalog: StoreCatalog;
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

export function StoreExperience({ childId, catalog }: Props) {
  const t = useTranslations("student.store");
  const tDesk = useTranslations("student.desktop");
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;
  const router = useRouter();
  const [tab, setTab] = useState<StoreCategory>("equipment");
  const [balance, setBalance] = useState(catalog.pointsBalance);
  const [items, setItems] = useState(catalog.items);
  const [selected, setSelected] = useState<StoreCatalogItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flySource = useRef<HTMLElement | null>(null);

  const visible = useMemo(() => items.filter((item) => item.category === tab), [items, tab]);
  const counts = useMemo(
    () => ({
      equipment: items.filter((item) => item.category === "equipment").length,
      furniture: items.filter((item) => item.category === "furniture").length,
    }),
    [items]
  );

  useEffect(() => {
    setChromePoints?.(balance);
  }, [balance, setChromePoints]);

  function openBuy(item: StoreCatalogItem, imageEl: HTMLElement | null) {
    setError(null);
    flySource.current = imageEl;
    setSelected(item);
  }

  async function confirmBuy() {
    if (!selected || submitting) return;
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
      setError(status === 409 ? t("alreadyOwned") : t("purchaseFailed"));
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
    <div className="md:grid md:grid-cols-[15.5rem_minmax(0,1fr)] md:items-start md:gap-7">
      <h1 className="sr-only md:hidden">{t("title")}</h1>
      <header className="mb-4 flex items-center justify-between gap-3 md:col-span-2 md:hidden" dir="ltr">
        <Image src="/images/brand/logo.png" alt="" width={150} height={80} className="h-11 w-auto object-contain" priority />
        <PointsPill count={balance} label={t("pointsUnit")} />
      </header>

      <aside className="hidden md:block">
        <h1 className="text-2xl font-extrabold text-text-navy">{t("title")}</h1>
        <div className="mt-4">
          <PointsPill count={balance} label={t("pointsUnit")} />
        </div>
        <nav className="mt-6" aria-label={t("tabsAria")}>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-gray">{tDesk("storeFilters")}</p>
          <div className="flex flex-col gap-2">
            <FilterButton active={tab === "equipment"} count={counts.equipment} onClick={() => setTab("equipment")}>
              {t("equipment")}
            </FilterButton>
            <FilterButton active={tab === "furniture"} count={counts.furniture} onClick={() => setTab("furniture")}>
              {t("furniture")}
            </FilterButton>
          </div>
        </nav>
      </aside>

      <div>
        <div className="mb-4 flex border-b-2 border-[#EFEFEF] md:hidden">
          <TabButton active={tab === "equipment"} onClick={() => setTab("equipment")}>
            {t("equipment")}
          </TabButton>
          <TabButton active={tab === "furniture"} onClick={() => setTab("furniture")}>
            {t("furniture")}
          </TabButton>
        </div>

        {error ? (
          <p className="login-error-enter mb-3 rounded-2xl bg-[#FDECEC] px-3 py-2 text-center text-sm font-bold text-[#C62828]" role="alert">
            {error}
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="py-16 text-center text-base font-bold text-text-gray">{t("emptyTab")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-5">
            {visible.map((item, index) => (
              <ProductCard key={item.id} item={item} index={index} onBuy={openBuy} />
            ))}
          </div>
        )}
      </div>

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

function FilterButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tDesk = useTranslations("student.desktop");
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-start text-sm font-extrabold transition-colors ${
        active ? "bg-[#FFF1E4] text-primary-orange" : "bg-white text-text-navy hover:bg-neutral-50"
      }`}
    >
      <span>{children}</span>
      <span className={`text-xs font-bold ${active ? "text-primary-orange" : "text-text-gray"}`}>
        {tDesk("itemCount", { count })}
      </span>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 pb-2.5 text-center text-base font-extrabold transition-colors ${
        active ? "text-primary-orange" : "text-text-gray"
      }`}
    >
      {children}
      {active ? <span className="absolute inset-x-6 -bottom-[2px] h-[3px] rounded-full bg-primary-orange" /> : null}
    </button>
  );
}
