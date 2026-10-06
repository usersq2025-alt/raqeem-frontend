"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { withChildQuery } from "@/lib/config/subjects";

// Bump when /public/hq-lab is republished so browsers fetch the new bundle/CSS.
const ASSET_VERSION = "1";
const BASE = "/hq-lab/";

type Mount = (
  el: HTMLElement,
  opts: { base: string; storageKey: string; defaults: { clinic: string } }
) => Promise<() => void>;

type Props = { childId: number; childName: string };

/** Hosts the 3D clinic (static bundle in /public/hq-lab) inside the student shell. */
export function Hq3dExperience({ childId, childName }: Props) {
  const t = useTranslations("student.hq");
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    void (async () => {
      try {
        const mod = (await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ `${BASE}app.bundle.js?v=${ASSET_VERSION}`
        )) as { mount: Mount };
        const stop = await mod.mount(el, {
          base: BASE,
          storageKey: `raqeem_hq3d_${childId}`,
          defaults: { clinic: "" },
        });
        if (cancelled) stop();
        else {
          unmount = stop;
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [childId, attempt]);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <link rel="stylesheet" href={`${BASE}hq3d.css?v=${ASSET_VERSION}`} />
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-text-navy md:text-2xl">{t("play3dTitle")}</h1>
          <p className="truncate text-xs font-bold text-text-gray md:text-sm">{childName}</p>
        </div>
        <Button
          href={withChildQuery("/headquarters", childId)}
          variant="secondary"
          fullWidth
          className="!min-h-10 !w-auto !px-5 !py-2 text-sm"
        >
          {t("play3dBack")}
        </Button>
      </header>

      <div className="relative h-[calc(100dvh-12.5rem)] min-h-[480px] md:h-[calc(100dvh-8.5rem)] md:min-h-[560px]">
        <div ref={host} className="hq3d h-full w-full" />
        {state !== "ready" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[28px] bg-white/90 p-6 text-center shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
            {state === "loading" ? (
              <>
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#FFE3CC] border-t-primary-orange" aria-hidden="true" />
                <p className="text-base font-extrabold text-text-navy" role="status">
                  {t("play3dLoading")}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-extrabold text-text-navy" role="alert">
                  {t("play3dError")}
                </p>
                <Button onClick={retry} fullWidth className="!w-auto !px-8">
                  {t("play3dRetry")}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
