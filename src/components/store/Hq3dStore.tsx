"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useStudentChrome } from "@/components/StudentChrome";
import { withChildQuery } from "@/lib/config/subjects";

const BASE = "/hq-lab/";

type CatalogTool = {
  id: string;
  name: string;
  class: "floor" | "table";
  thumb: string | null;
  info?: { emoji?: string; why?: string };
};

type Hq3dLoad = { points_balance: number; prices: Record<string, number>; owned: Record<string, number> };

type Props = { childId: number };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
  return (await response.json()) as T;
}

/** Store tab for the 3D clinic: every tool with a clear price, owned count and buy button. */
export function Hq3dStore({ childId }: Props) {
  const t = useTranslations("student.hq");
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;
  const [tools, setTools] = useState<CatalogTool[]>([]);
  const [data, setData] = useState<Hq3dLoad | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [catalog, state] = await Promise.all([
        json<{ tools: CatalogTool[] }>(`${BASE}catalog.json`),
        json<Hq3dLoad>(`/api/students/${childId}/hq3d`),
      ]);
      setTools(catalog.tools);
      setData(state);
      setChromePoints?.(state.points_balance);
    } catch {
      setFailed(true);
    }
  }, [childId, setChromePoints]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  const groups = useMemo(
    () => [
      { key: "floor", title: t("storeGroupFloor"), items: tools.filter((x) => x.class === "floor") },
      { key: "table", title: t("storeGroupSmall"), items: tools.filter((x) => x.class === "table") },
    ],
    [tools, t]
  );

  async function buy(tool: CatalogTool) {
    if (!data || busy) return;
    setBusy(tool.id);
    try {
      const result = await json<{ points_balance: number; owned: Record<string, number> }>(
        `/api/students/${childId}/hq3d/buy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId: tool.id }),
        }
      );
      setData({ ...data, points_balance: result.points_balance, owned: result.owned });
      setChromePoints?.(result.points_balance);
      setFlash({ id: tool.id, ok: true });
    } catch {
      setFlash({ id: tool.id, ok: false });
      void load();
    } finally {
      setBusy(null);
      window.setTimeout(() => setFlash(null), 2200);
    }
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white p-8 text-center shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
        <p className="text-base font-extrabold text-text-navy" role="alert">
          {t("storeError")}
        </p>
        <Button onClick={() => void load()} fullWidth className="!w-auto !px-8">
          {t("play3dRetry")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-16 text-center text-base font-extrabold text-text-gray" role="status">
        {t("play3dLoading")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-white p-4 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:p-5">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-text-navy md:text-2xl">{t("storeTitle")}</h1>
          <p className="mt-1 text-sm font-bold text-text-gray">{t("storeSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#FFF3E3] px-4 py-2 text-base font-extrabold text-primary-orange" aria-live="polite">
            ⭐ {data.points_balance} {t("pointsUnit")}
          </span>
          <Button
            href={withChildQuery("/headquarters/3d", childId)}
            fullWidth
            className="!min-h-11 !w-auto !px-5 !py-2 text-sm"
          >
            {t("goToClinic")}
          </Button>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`hq3d-${group.key}`}>
          <h2 id={`hq3d-${group.key}`} className="mb-3 px-1 text-base font-extrabold text-text-navy">
            {group.title}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {group.items.map((tool) => {
              const price = data.prices[tool.id] ?? 0;
              const owned = data.owned[tool.id] ?? 0;
              const missing = Math.max(0, price - data.points_balance);
              const affordable = missing === 0;
              const mine = flash?.id === tool.id ? flash : null;
              return (
                <li
                  key={tool.id}
                  className="flex flex-col gap-2 rounded-[24px] bg-white p-3 shadow-[0_12px_28px_-22px_rgba(26,43,71,0.45)]"
                >
                  <div className="relative flex aspect-square items-center justify-center rounded-[18px] bg-[#F7FBFF]">
                    {tool.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static WebP thumbnails served from /public
                      <img
                        src={`${BASE}${tool.thumb.replace(/^\.\//, "")}`}
                        alt=""
                        loading="lazy"
                        className="h-[88%] w-[88%] object-contain"
                      />
                    ) : null}
                    {owned > 0 ? (
                      <span className="absolute start-2 top-2 rounded-full bg-[#2DBEA1] px-2.5 py-0.5 text-xs font-extrabold text-white">
                        {t("storeOwned", { count: owned })}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-extrabold leading-snug text-text-navy">{tool.name}</h3>
                  {tool.info?.why ? (
                    <p className="line-clamp-2 min-h-[2.4em] text-xs font-bold leading-relaxed text-text-gray">{tool.info.why}</p>
                  ) : null}
                  <p className="text-base font-extrabold text-primary-orange">
                    {price} {t("pointsUnit")}
                  </p>
                  <Button
                    onClick={() => void buy(tool)}
                    disabled={!affordable || busy !== null}
                    fullWidth
                    className="!min-h-11 !px-3 !py-2 text-sm"
                  >
                    {mine?.ok
                      ? t("storeBought")
                      : mine && !mine.ok
                        ? t("storeFailed")
                        : affordable
                          ? t("storeBuy")
                          : t("storeNeedMore", { count: missing })}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
