"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function QuestionImage({ src, alt }: { src: string | null; alt?: string | null }) {
  const t = useTranslations("questionImage");
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  if (!src) return null;
  const description = alt?.trim() || t("description");
  return (
    <figure className="mx-auto mt-4 max-w-2xl">
      {failed ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-bold text-text-navy">
          <p>{t("failed")}</p>
          <button type="button" onClick={() => { setFailed(false); setRetry(retry + 1); }} className="mt-2 min-h-11 rounded-xl bg-white px-4 text-primary-orange focus-visible:outline-2 focus-visible:outline-offset-2">{t("retry")}</button>
        </div>
      ) : (
        <button type="button" onClick={() => dialog.current?.showModal()} aria-label={t("enlarge")} className="block w-full rounded-2xl border border-slate-100 bg-white p-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-orange">
          <Image key={retry} src={src} alt={description} width={1200} height={800} unoptimized onError={() => setFailed(true)} className="mx-auto h-auto max-h-[340px] w-auto max-w-full rounded-xl object-contain" />
          <span className="mt-2 block text-xs font-bold text-text-gray">{t("enlarge")}</span>
        </button>
      )}
      <dialog ref={dialog} aria-label={t("enlarge")} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(94vw,1000px)] rounded-3xl border-0 bg-white p-4 shadow-xl backdrop:bg-black/60">
        <form method="dialog" className="mb-3 flex justify-end"><button autoFocus type="submit" className="min-h-11 rounded-xl bg-slate-100 px-5 font-bold text-text-navy">{t("close")}</button></form>
        <Image src={src} alt={description} width={1200} height={800} unoptimized className="mx-auto h-auto max-h-[72dvh] w-auto max-w-full object-contain" />
      </dialog>
    </figure>
  );
}
