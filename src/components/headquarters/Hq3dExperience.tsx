"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { withChildQuery } from "@/lib/config/subjects";
import { Button } from "@/components/ui/Button";
import { useStudentChrome } from "@/components/StudentChrome";
import { HQ3D_BUNDLE, hq3dBase, type Hq3dProfession } from "@/lib/config/hq3d";

// Bump when /public/hq-lab is republished so browsers fetch the new bundle/CSS.
const ASSET_VERSION = "9";

type Hq3dLoad = {
  points_balance: number;
  prices: Record<string, number>;
  owned: Record<string, number>;
  state: Record<string, unknown> | null;
};

type Remote = {
  load: () => Promise<Hq3dLoad>;
  save: (state: unknown) => Promise<void>;
  onPoints: (balance: number) => void;
};

type Mount = (
  el: HTMLElement,
  opts: {
    base: string;
    profession: string;
    remote: Remote;
    defaults: { clinic: string };
    initialPlace: string | null;
    onOpenStore: () => void;
    onConsumed: () => void;
  }
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

type Props = { childId: number; childName: string; profession: Hq3dProfession; initialPlace?: string | null };

/** Hosts the 3D clinic (static bundle in /public/hq-lab) inside the student shell, wired to the student's points. */
export function Hq3dExperience({ childId, profession, initialPlace = null }: Props) {
  const router = useRouter();
  const initialPlaceRef = useRef(initialPlace);
  const t = useTranslations("student.hq");
  const th = useTranslations("student.hq.hq3d");
  const base = hq3dBase(profession);
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
          /* webpackIgnore: true */ /* turbopackIgnore: true */ `${HQ3D_BUNDLE}?v=${ASSET_VERSION}`
        )) as { mount: Mount };
        const stop = await mod.mount(el, {
          base,
          profession,
          remote,
          defaults: { clinic: "" },
          initialPlace: initialPlaceRef.current,
          onOpenStore: () => router.push(withChildQuery("/store", childId)),
          onConsumed: () => {
            // the arrival is one-shot: drop ?place= so a refresh never re-triggers it (ownership itself is server-side)
            initialPlaceRef.current = null;
            const url = new URL(window.location.href);
            if (url.searchParams.has("place")) {
              url.searchParams.delete("place");
              window.history.replaceState(window.history.state, "", url.toString());
            }
          },
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
    // setChromePoints is stable (state setter); re-running on it would remount the game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, attempt, base, profession]);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <div>
      <link rel="stylesheet" href={`/hq-lab/hq3d.css?v=${ASSET_VERSION}`} />
      <h1 className="sr-only">{th(`${profession}.title`)}</h1>

      {/* the scene takes all the room the student shell leaves (bottom nav on phones, side nav on wide screens) */}
      <div className="relative h-[calc(100dvh-7.75rem)] min-h-[460px] md:h-[calc(100dvh-3.5rem)] md:min-h-[560px]">
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
