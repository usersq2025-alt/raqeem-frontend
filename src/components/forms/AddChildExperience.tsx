"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AddChildForm } from "@/components/forms/AddChildForm";
import { AddAnotherChildModal } from "@/components/modals/AddAnotherChildModal";

const ORDINAL_KEY = "raqeem:add-child-ordinal";

function readOrdinal() {
  try {
    const stored = Number(sessionStorage.getItem(ORDINAL_KEY));
    return Number.isFinite(stored) && stored >= 1 ? stored : 1;
  } catch {
    return 1;
  }
}

function writeOrdinal(value: number) {
  try {
    sessionStorage.setItem(ORDINAL_KEY, String(value));
  } catch {
    /* private mode */
  }
}

function ordinalMessage(
  n: number,
  t: (key: "ordinal.1" | "ordinal.2" | "ordinal.3" | "ordinal.4" | "ordinal.5" | "ordinal.n", values?: { n: number }) => string
) {
  if (n === 1) return t("ordinal.1");
  if (n === 2) return t("ordinal.2");
  if (n === 3) return t("ordinal.3");
  if (n === 4) return t("ordinal.4");
  if (n === 5) return t("ordinal.5");
  return t("ordinal.n", { n });
}

export function AddChildExperience() {
  const t = useTranslations("child");
  const router = useRouter();
  const [ordinal, setOrdinal] = useState(1);
  const [cycle, setCycle] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savedName, setSavedName] = useState("");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    setOrdinal(readOrdinal());
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const handleSaved = useCallback((firstName: string) => {
    setSavedName(firstName);
    setModalOpen(true);
    writeOrdinal(readOrdinal() + 1);
  }, []);

  const goToPlatform = useCallback(() => {
    setModalOpen(false);
    router.push("/children");
  }, [router]);

  const addAnother = useCallback(() => {
    setModalOpen(false);
    setExiting(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resetTimer.current = window.setTimeout(
      () => {
        setOrdinal(readOrdinal());
        setSavedName("");
        setCycle((current) => current + 1);
        setExiting(false);
        resetTimer.current = null;
      },
      reduced ? 0 : 280
    );
  }, []);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-auto h-32 overflow-hidden md:hidden" aria-hidden="true">
        <span className="absolute -start-1 bottom-6 h-3 w-3 rotate-12 rounded-[2px] bg-amber-300" />
        <span className="absolute start-8 bottom-3 h-2.5 w-2.5 rounded-full bg-sky-300" />
        <span className="absolute end-6 bottom-8 h-3 w-3 rotate-45 bg-violet-300" />
        <span className="absolute end-14 bottom-3 h-2 w-3.5 -rotate-12 rounded-[2px] bg-pink-300" />
      </div>

      <div className={exiting ? "child-form-exit" : "child-form-enter"} key={cycle}>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-[0_6px_16px_-10px_rgba(244,130,50,0.8)]">
            <span className="text-amber-400" aria-hidden="true">
              ★
            </span>
            {ordinalMessage(ordinal, t)}
          </span>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
          {t("title")}
        </h1>
        <p className="mx-auto mt-2 max-w-[22rem] text-center text-sm leading-6 text-text-gray">
          {t("subtitle")}
        </p>
        <AddChildForm key={cycle} onSaved={handleSaved} />
      </div>

      <AddAnotherChildModal
        open={modalOpen}
        childName={savedName}
        onAddAnother={addAnother}
        onGoToPlatform={goToPlatform}
      />
    </>
  );
}
