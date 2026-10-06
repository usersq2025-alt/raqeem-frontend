"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useStudentChrome } from "@/components/StudentChrome";

// Bump when /public/hq-lab is republished so browsers fetch the new bundle/CSS.
const ASSET_VERSION = "4";
const BASE = "/hq-lab/";

type Hq3dLoad = {
  points_balance: number;
  prices: Record<string, number>;
  owned: Record<string, number>;
  state: Record<string, unknown> | null;
};

type Remote = {
  load: () => Promise<Hq3dLoad>;
  buy: (toolId: string) => Promise<{ points_balance: number; owned: Record<string, number> }>;
  save: (state: unknown) => Promise<void>;
  onPoints: (balance: number) => void;
};

type Mount = (
  el: HTMLElement,
  opts: { base: string; remote: Remote; defaults: { clinic: string } }
) => Promise<() => void>;

class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw new HttpError(response.status);
  return (await response.json()) as T;
}

type Props = { childId: number; childName: string };

/** Hosts the 3D clinic (static bundle in /public/hq-lab) inside the student shell, wired to the student's points. */
export function Hq3dExperience({ childId }: Props) {
  const t = useTranslations("student.hq");
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    const api = `/api/students/${childId}/hq3d`;
    const remote: Remote = {
      load: async () => {
        const data = await http<Hq3dLoad>(api);
        setChromePoints?.(data.points_balance);
        return data;
      },
      buy: (toolId) =>
        http(`${api}/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId }),
        }),
      save: async (payload) => {
        await http(`${api}/state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: payload }),
          keepalive: true,
        });
      },
      onPoints: (balance) => setChromePoints?.(balance),
    };
    void (async () => {
      try {
        const mod = (await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ `${BASE}app.bundle.js?v=${ASSET_VERSION}`
        )) as { mount: Mount };
        const stop = await mod.mount(el, { base: BASE, remote, defaults: { clinic: "" } });
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
    // setChromePoints is stable (state setter); re-running on it would remount the game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, attempt]);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <link rel="stylesheet" href={`${BASE}hq3d.css?v=${ASSET_VERSION}`} />
      <header className="min-w-0">
        <h1 className="truncate text-xl font-extrabold text-text-navy md:text-2xl">{t("play3dTitle")}</h1>
      </header>

      <div className="relative h-[calc(100dvh-11rem)] min-h-[480px] md:h-[calc(100dvh-8.5rem)] md:min-h-[560px]">
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
