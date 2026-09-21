"use client";

import Image from "next/image";
import { toIndicDigits } from "@/lib/format/indicDigits";

export type NextRewardInfo = {
  name: string;
  imageUrl: string | null;
  pricePoints: number;
  pointsBalance: number;
  allComplete?: boolean;
};

type Props = {
  reward: NextRewardInfo | null;
  loading?: boolean;
  labels: {
    title: string;
    remaining: string;
    progress: string;
    allComplete: string;
    points: string;
  };
};

/** Motivational only — never purchases from the journey screen. */
export function NextHeadquartersReward({ reward, loading = false, labels }: Props) {
  if (loading || !reward) return null;

  if (reward.allComplete) {
    return (
      <aside className="mx-auto mb-3 w-[92%] max-w-md rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-emerald-100 backdrop-blur-sm">
        <p className="text-center text-xs font-extrabold text-emerald-700">{labels.allComplete}</p>
      </aside>
    );
  }

  const price = Math.max(0, reward.pricePoints);
  const balance = Math.max(0, reward.pointsBalance);
  const pct = price > 0 ? Math.min(100, Math.round((balance / price) * 100)) : 0;
  const remaining = Math.max(0, price - balance);

  return (
    <aside className="mx-auto mb-3 flex w-[92%] max-w-md items-center gap-3 rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-brand-navy/8 backdrop-blur-sm">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-50 ring-1 ring-brand-navy/5">
        {reward.imageUrl ? (
          <Image src={reward.imageUrl} alt="" width={48} height={48} unoptimized className="h-10 w-10 object-contain" />
        ) : (
          <span className="h-6 w-6 rounded-md bg-neutral-200" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-extrabold text-text-navy">
          {labels.title}: {reward.name}
        </p>
        <p className="mt-0.5 text-[10px] font-bold text-text-gray">
          {remaining > 0
            ? labels.remaining.replace("#count#", toIndicDigits(remaining))
            : labels.progress
                .replace("#have#", toIndicDigits(Math.min(balance, price)))
                .replace("#need#", toIndicDigits(price))}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-primary-orange transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] font-bold text-text-gray">
          {labels.points
            .replace("#price#", toIndicDigits(price))
            .replace("#balance#", toIndicDigits(balance))}
        </p>
      </div>
    </aside>
  );
}
