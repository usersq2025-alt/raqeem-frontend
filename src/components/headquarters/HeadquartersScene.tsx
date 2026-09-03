"use client";

import { useTranslations } from "next-intl";
import type { HeadquartersItem, HeadquartersSceneData } from "@/lib/api/store";

type Props = {
  scene: HeadquartersSceneData;
  highlightId: number | null;
};

export function HeadquartersScene({ scene, highlightId }: Props) {
  const t = useTranslations("student.store");

  return (
    <div className="hq-viewport">
      <div className="hq-stage">
        <img
          src="/images/headquarters/room.png?v=1"
          alt=""
          className="pointer-events-none block h-auto w-full select-none"
        />
        {scene.items.map((item) => (
          <PlacedItem
            key={item.id}
            item={item}
            highlighted={highlightId === item.id}
            label={t(`items.${item.slotKey}`)}
            futureDoctor={t("futureDoctor")}
          />
        ))}
      </div>
    </div>
  );
}

function PlacedItem({
  item,
  highlighted,
  label,
  futureDoctor,
}: {
  item: HeadquartersItem;
  highlighted: boolean;
  label: string;
  futureDoctor: string;
}) {
  return (
    <div
      className={`hq-placed absolute ${highlighted ? "hq-item-glow" : ""}`}
      style={{
        left: `${item.xPct}%`,
        top: `${item.yPct}%`,
        width: `${item.widthPct}%`,
        zIndex: item.zIndex,
        viewTransitionName: `store-item-${item.slotKey}`,
      }}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={label} className="h-auto w-full object-contain drop-shadow-[0_12px_16px_rgba(26,43,71,0.28)]" />
      ) : (
        <span className="block aspect-square rounded-2xl bg-white/80" />
      )}
      {item.slotKey === "stethoscope" ? (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-primary-orange shadow-sm">
          {futureDoctor}
        </span>
      ) : null}
    </div>
  );
}
