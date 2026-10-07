"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useStudentChrome } from "@/components/StudentChrome";
import { withChildQuery } from "@/lib/config/subjects";
import { HQ3D_BUNDLE, hq3dBase, type Hq3dProfession } from "@/lib/config/hq3d";

// Bump when /public/hq-lab is republished so browsers fetch the new bundle.
const ASSET_VERSION = "9";

type CatalogTool = {
  id: string;
  name: string;
  class: "floor" | "table" | "wall";
  thumb: string | null;
  info?: { emoji?: string; why?: string; how?: string[] };
};

type Hq3dLoad = { points_balance: number; prices: Record<string, number>; owned: Record<string, number> };

type PreviewViewer = {
  groups: { key: string; label: string; icon: string }[];
  hasColor: boolean;
  toggle: (key: string) => void;
  cycleColor: () => void;
  dispose: () => void;
};
type Shelf = {
  card: (canvas: HTMLCanvasElement, id: string, onReady?: () => void) => () => void;
  viewer: (canvas: HTMLCanvasElement, id: string) => Promise<PreviewViewer>;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
  return (await response.json()) as T;
}

function posterSrc(base: string, tool: CatalogTool) {
  return tool.thumb ? `${base}${tool.thumb.replace(/^\.\//, "")}` : null;
}

/** After a successful purchase: show the tool and let the student place it now or later (ownership is already saved server-side). */
function ArrivalDialog({ tool, base, onPlace, onLater }: { tool: CatalogTool; base: string; onPlace: () => void; onLater: () => void }) {
  const t = useTranslations("student.hq");
  const poster = posterSrc(base, tool);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLater]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A2B47]/55 p-0 backdrop-blur-sm md:items-center md:p-6" role="presentation" onClick={onLater}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t("arrivalTitle")}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-t-[32px] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center shadow-[0_24px_60px_-20px_rgba(26,43,71,0.7)] md:rounded-[32px]"
      >
        <span className="flex h-36 w-36 items-center justify-center rounded-full bg-[#FFF3E3]">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- static WebP thumbnail from /public
            <img src={poster} alt="" className="h-[86%] w-[86%] object-contain" />
          ) : (
            <span aria-hidden="true" className="text-6xl">🎁</span>
          )}
        </span>
        <h2 className="text-2xl font-extrabold text-text-navy">🎉 {t("arrivalTitle")}</h2>
        <p className="text-sm font-bold leading-relaxed text-text-gray">{t("arrivalBody", { name: tool.name })}</p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={onPlace} fullWidth className="!min-h-12">
            {t("arrivalPlace")}
          </Button>
          <Button onClick={onLater} variant="secondary" fullWidth className="!min-h-12">
            {t("arrivalLater")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Live, slowly rotating 3D model; the static thumbnail shows until the model is ready (or if WebGL fails). */
function ToolCanvas({ shelf, tool, base }: { shelf: Shelf | null; tool: CatalogTool; base: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const canvas = ref.current;
    if (!shelf || !canvas) return;
    return shelf.card(canvas, tool.id, () => setReady(true));
  }, [shelf, tool.id]);
  const poster = posterSrc(base, tool);
  return (
    <>
      {!ready && poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- static WebP thumbnails served from /public
        <img src={poster} alt="" loading="lazy" className="absolute inset-0 m-auto h-[88%] w-[88%] object-contain" />
      ) : null}
      <canvas
        ref={ref}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

type PreviewProps = {
  shelf: Shelf;
  tool: CatalogTool;
  price: number;
  owned: number;
  balance: number;
  busy: boolean;
  onBuy: () => void;
  onClose: () => void;
};

/** Try-before-you-buy dialog: orbit the tool and press its real controls. */
function ToolPreview({ shelf, tool, price, owned, balance, busy, onBuy, onClose }: PreviewProps) {
  const t = useTranslations("student.hq");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewer, setViewer] = useState<PreviewViewer | null>(null);
  const [failed, setFailed] = useState(false);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let current: PreviewViewer | null = null;
    shelf
      .viewer(canvas, tool.id)
      .then((v) => {
        if (cancelled) v.dispose();
        else {
          current = v;
          setViewer(v);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      current?.dispose();
    };
  }, [shelf, tool.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const missing = Math.max(0, price - balance);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1A2B47]/55 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tool.name}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_24px_60px_-20px_rgba(26,43,71,0.7)] md:rounded-[32px]"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="min-w-0 truncate text-lg font-extrabold text-text-navy md:text-xl">
            {tool.info?.emoji ? `${tool.info.emoji} ` : ""}
            {tool.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("storeClose")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1F5FB] text-lg font-extrabold text-text-navy"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-3 overflow-y-auto p-5 md:grid-cols-2 md:gap-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px] bg-gradient-to-b from-[#EAF4FF] to-[#F7FBFF] md:aspect-square">
            <canvas ref={canvasRef} className="h-full w-full cursor-grab touch-none" aria-label={tool.name} />
            {!viewer && !failed ? (
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-text-gray" role="status">
                {t("play3dLoading")}
              </span>
            ) : null}
            {failed ? (
              <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-extrabold text-text-gray">
                {t("storePreviewFailed")}
              </span>
            ) : null}
            <span className="pointer-events-none absolute bottom-2 start-0 end-0 text-center text-xs font-bold text-text-gray">
              {t("storeDragHint")}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {viewer && (viewer.groups.length > 0 || viewer.hasColor) ? (
              <div>
                <p className="mb-2 text-sm font-extrabold text-text-navy">{t("storeTryIt")}</p>
                <div className="flex flex-wrap gap-2">
                  {viewer.groups.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      aria-pressed={Boolean(pressed[group.key])}
                      onClick={() => {
                        viewer.toggle(group.key);
                        setPressed((p) => ({ ...p, [group.key]: !p[group.key] }));
                      }}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                        pressed[group.key] ? "bg-primary-orange text-white" : "bg-[#FFF3E3] text-primary-orange"
                      }`}
                    >
                      <span aria-hidden="true">{group.icon}</span>
                      {group.label}
                    </button>
                  ))}
                  {viewer.hasColor ? (
                    <button
                      type="button"
                      onClick={() => viewer.cycleColor()}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#EDE5FA] px-4 py-2 text-sm font-extrabold text-[#6B45AB]"
                    >
                      <span aria-hidden="true">🎨</span>
                      {t("storeColor")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tool.info?.why ? (
              <div>
                <p className="text-sm font-extrabold text-text-navy">{t("storeWhy")}</p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-text-gray">{tool.info.why}</p>
              </div>
            ) : null}
            {tool.info?.how?.length ? (
              <div>
                <p className="text-sm font-extrabold text-text-navy">{t("storeHow")}</p>
                <ol className="mt-1 list-decimal space-y-0.5 ps-5 text-sm font-bold leading-relaxed text-text-gray">
                  {tool.info.how.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#E3EAF3] bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-primary-orange">
              {price} {t("pointsUnit")}
            </p>
            {owned > 0 ? <p className="text-xs font-bold text-[#1C8E78]">{t("storeOwned", { count: owned })}</p> : null}
          </div>
          <Button onClick={onBuy} disabled={missing > 0 || busy} fullWidth className="!min-h-12 !w-auto !px-8 text-base">
            {missing > 0 ? t("storeNeedMore", { count: missing }) : t("storeBuy")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Store tab for the 3D clinic: live 3D cards, try-before-you-buy preview, clear prices. */
export function Hq3dStore({ childId, profession }: { childId: number; profession: Hq3dProfession }) {
  const t = useTranslations("student.hq");
  const th = useTranslations("student.hq.hq3d");
  const BASE = hq3dBase(profession);
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;
  const [tools, setTools] = useState<CatalogTool[]>([]);
  const [data, setData] = useState<Hq3dLoad | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [arrived, setArrived] = useState<CatalogTool | null>(null);
  const router = useRouter();

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
  }, [childId, setChromePoints, BASE]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  // 3D previews are an enhancement: if the bundle or WebGL fails the static thumbnails remain.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = (await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ `${HQ3D_BUNDLE}?v=${ASSET_VERSION}`
        )) as { createShelf: (base: string) => Promise<Shelf> };
        const created = await mod.createShelf(BASE);
        if (!cancelled) setShelf(created);
      } catch {
        /* keep thumbnails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [BASE]);

  const groups = useMemo(
    () => [
      { key: "floor", title: th(`${profession}.groupFloor`), items: tools.filter((x) => x.class === "floor") },
      { key: "table", title: th(`${profession}.groupSmall`), items: tools.filter((x) => x.class === "table") },
      { key: "wall", title: th(`${profession}.groupWall`), items: tools.filter((x) => x.class === "wall") },
    ].filter((g) => g.items.length > 0),
    [tools, th, profession]
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
      setPreviewId(null);
      setArrived(tool);
    } catch {
      setFlash({ id: tool.id, ok: false });
      void load();
    } finally {
      setBusy(null);
      window.setTimeout(() => setFlash(null), 2200);
    }
  }

  const closePreview = useCallback(() => setPreviewId(null), []);

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

  const previewTool = previewId ? tools.find((x) => x.id === previewId) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-white p-4 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:p-5">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-text-navy md:text-2xl">{th(`${profession}.storeTitle`)}</h1>
          <p className="mt-1 text-sm font-bold text-text-gray">{th(`${profession}.storeSubtitle`)}</p>
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
            {th(`${profession}.goTo`)}
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
              const mine = flash?.id === tool.id ? flash : null;
              return (
                <li
                  key={tool.id}
                  className="flex flex-col gap-2 rounded-[24px] bg-white p-3 shadow-[0_12px_28px_-22px_rgba(26,43,71,0.45)]"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewId(tool.id)}
                    aria-label={`${t("storeTryIt")}: ${tool.name}`}
                    className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-gradient-to-b from-[#EAF4FF] to-[#F7FBFF]"
                  >
                    <ToolCanvas shelf={shelf} tool={tool} base={BASE} />
                    {owned > 0 ? (
                      <span className="absolute start-2 top-2 rounded-full bg-[#2DBEA1] px-2.5 py-0.5 text-xs font-extrabold text-white">
                        {t("storeOwned", { count: owned })}
                      </span>
                    ) : null}
                    {shelf ? (
                      <span className="absolute bottom-2 end-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold text-primary-orange shadow">
                        {t("storeTryShort")}
                      </span>
                    ) : null}
                  </button>
                  <h3 className="text-sm font-extrabold leading-snug text-text-navy">{tool.name}</h3>
                  <p className="text-base font-extrabold text-primary-orange">
                    {price} {t("pointsUnit")}
                  </p>
                  <Button
                    onClick={() => void buy(tool)}
                    disabled={missing > 0 || busy !== null}
                    fullWidth
                    className="!min-h-11 !px-3 !py-2 text-sm"
                  >
                    {mine?.ok
                      ? t("storeBought")
                      : mine && !mine.ok
                        ? t("storeFailed")
                        : missing === 0
                          ? t("storeBuy")
                          : t("storeNeedMore", { count: missing })}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {arrived ? (
        <ArrivalDialog
          tool={arrived}
          base={BASE}
          onLater={() => setArrived(null)}
          onPlace={() => router.push(`${withChildQuery("/headquarters/3d", childId)}&place=${encodeURIComponent(arrived.id)}`)}
        />
      ) : null}

      {previewTool && shelf ? (
        <ToolPreview
          key={previewTool.id}
          shelf={shelf}
          tool={previewTool}
          price={data.prices[previewTool.id] ?? 0}
          owned={data.owned[previewTool.id] ?? 0}
          balance={data.points_balance}
          busy={busy !== null}
          onBuy={() => void buy(previewTool)}
          onClose={closePreview}
        />
      ) : null}
    </div>
  );
}
