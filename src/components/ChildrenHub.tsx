"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { ChildCard } from "@/components/ChildCard";
import { AddChildCard } from "@/components/AddChildCard";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ChildrenApiError, getChildren, type ChildProfile } from "@/lib/api/children";
import { useRouter } from "@/i18n/navigation";

const POINTS_SEEN_KEY = "raqeem:hub-points-seen";

type Props = {
  parentName: string;
};

function firstName(fullName: string) {
  const token = fullName.trim().split(/\s+/)[0];
  return token || fullName;
}

function visibleHubCards(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>("[data-hub-card]")].filter(
    (card) => card.getBoundingClientRect().width >= 8
  );
}

export function ChildrenHub({ parentName }: Props) {
  const t = useTranslations("hub");
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [children, setChildren] = useState<ChildProfile[] | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const [animatePoints, setAnimatePoints] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(POINTS_SEEN_KEY)) {
        setAnimatePoints(true);
        sessionStorage.setItem(POINTS_SEEN_KEY, "1");
      }
    } catch {
      setAnimatePoints(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getChildren()
      .then((list) => {
        if (!cancelled) setChildren(list);
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ChildrenApiError && caught.code === "UNAUTHENTICATED") {
          router.replace("/login");
          return;
        }
        setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateActive = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const cards = visibleHubCards(root);
    if (!cards.length) return;
    const mid = root.getBoundingClientRect().left + root.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, index) => {
      const box = card.getBoundingClientRect();
      const dist = Math.abs(box.left + box.width / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    updateActive();
    root.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      root.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [children, updateActive]);

  const name = firstName(parentName);
  const list = children ?? [];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-white">
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
        <div className="absolute -start-20 top-8 h-72 w-72 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="absolute -end-16 top-24 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-10 start-1/3 h-64 w-64 rounded-full bg-emerald-200/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <SettingsMenu />
        </header>

        <div className="mt-8 md:mt-10 md:grid md:grid-cols-[minmax(0,1fr)_19rem] md:items-start md:gap-10">
          <div>
            <div className="text-center md:text-start">
              <h1 className="text-2xl font-extrabold text-text-navy md:text-[1.85rem]">
                {t("greeting", { name })}
              </h1>
              <p className="mt-1.5 text-sm text-text-gray md:text-base">{t("subtitle")}</p>
              <p className="mt-2 hidden text-sm font-semibold text-text-gray md:block">{t("desktopHint")}</p>
            </div>

            {children === null && !error ? (
              <div className="mt-12 flex justify-center gap-4 overflow-hidden">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-72 w-56 shrink-0 animate-pulse rounded-[28px] bg-neutral-100"
                  />
                ))}
              </div>
            ) : null}

            {error && children === null ? (
              <p className="mt-16 text-center text-sm text-red-600">{t("loadError")}</p>
            ) : null}

            {children ? (
              <>
                <div className="relative mt-8 md:hidden">
                  <div
                    ref={scrollerRef}
                    className="hub-snap flex gap-4 overflow-x-auto px-1 pb-4 pt-2"
                  >
                    {list.map((child, index) => (
                      <div key={child.id} data-hub-card>
                        <ChildCard child={child} index={index} animatePoints={animatePoints} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 hidden grid-cols-2 gap-5 md:grid">
                  {list.map((child, index) => (
                    <ChildCard key={child.id} child={child} index={index} animatePoints={animatePoints} />
                  ))}
                </div>

                {list.length > 0 ? (
                  <div className="mt-2 flex justify-center gap-1.5 md:hidden" aria-hidden="true">
                    {list.map((child, index) => (
                      <span
                        key={child.id}
                        className={`h-2 rounded-full transition-[width,background-color] duration-200 ${
                          index === active ? "w-5 bg-primary-orange" : "w-2 bg-neutral-200"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-auto pt-6 md:hidden">
                  <AddChildCard variant="bar" />
                </div>
              </>
            ) : null}
          </div>

          <aside className="sticky top-8 hidden rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.35)] md:block">
            <p className="text-sm font-extrabold text-text-navy">{t("childrenCount", { count: list.length })}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-text-gray">{t("desktopAside")}</p>
            <div className="mt-4">
              <AddChildCard variant="tile" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
