"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import type { HeadquartersItem, HeadquartersSceneData } from "@/lib/api/store";
import { updateHeadquartersItemPosition } from "@/lib/api/store";

type Props = {
  scene: HeadquartersSceneData;
  studentId: number;
  highlightId: number | null;
  editable?: boolean;
};

type LocalItem = HeadquartersItem;

export function HeadquartersScene({ scene, studentId, highlightId, editable = false }: Props) {
  const t = useTranslations("student.store");
  const tHq = useTranslations("student.hq");
  const [items, setItems] = useState<LocalItem[]>(scene.items);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    itemId: number;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    currentX: number;
    currentY: number;
    currentZ: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setItems(scene.items);
  }, [scene.items]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.zIndex - b.zIndex || a.id - b.id),
    [items]
  );

  async function onItemPositionChange(itemId: number, x: number, y: number, zIndex?: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              x,
              y,
              zIndex: zIndex ?? item.zIndex,
            }
          : item
      )
    );
    setSavingId(itemId);
    try {
      const saved = await updateHeadquartersItemPosition(studentId, itemId, { x, y, zIndex });
      setItems((prev) => prev.map((item) => (item.id === itemId ? saved : item)));
    } catch {
      setItems(scene.items);
    } finally {
      setSavingId(null);
    }
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, item: LocalItem) {
    if (!editable) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const maxZ = items.reduce((max, row) => Math.max(max, row.zIndex), 1);
    const nextZ = maxZ + 1;
    dragRef.current = {
      itemId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x,
      originY: item.y,
      currentX: item.x,
      currentY: item.y,
      currentZ: nextZ,
      moved: false,
    };
    setDragId(item.id);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, zIndex: nextZ } : row))
    );
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    const stage = stageRef.current;
    if (!active || active.pointerId !== event.pointerId || !stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dxPct = ((event.clientX - active.startX) / rect.width) * 100;
    const dyPct = ((event.clientY - active.startY) / rect.height) * 100;
    if (Math.hypot(dxPct, dyPct) > 0.4) active.moved = true;
    const nextX = clamp(active.originX + dxPct, 4, 96);
    const nextY = clamp(active.originY + dyPct, 4, 96);
    active.currentX = nextX;
    active.currentY = nextY;
    setItems((prev) =>
      prev.map((row) => (row.id === active.itemId ? { ...row, x: nextX, y: nextY } : row))
    );
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragId(null);
    if (!active.moved) return;
    void onItemPositionChange(
      active.itemId,
      Number(active.currentX.toFixed(2)),
      Number(active.currentY.toFixed(2)),
      active.currentZ
    );
  }

  return (
    <div className="hq-viewport">
      {editable ? (
        <p className="mb-2 text-center text-xs font-bold text-text-gray md:text-start">{tHq("dragHint")}</p>
      ) : null}
      <div ref={stageRef} className="hq-stage">
        <img
          src="/images/headquarters/doctor/stages/stage-00-empty.png"
          alt=""
          className="pointer-events-none block h-auto w-full select-none"
          draggable={false}
        />
        <div className="hq-layer absolute inset-0" aria-label={t("hqTitle")}>
          {sorted.map((item) => (
            <PlacedItem
              key={item.id}
              item={item}
              highlighted={highlightId === item.id}
              dragging={dragId === item.id}
              editable={editable}
              saving={savingId === item.id}
              label={item.name || (t.has(`items.${item.slotKey}`) ? t(`items.${item.slotKey}` as "items.heartbeat_rug") : item.slotKey)}
              futureDoctor={t("futureDoctor")}
              onPointerDown={(event) => onPointerDown(event, item)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlacedItem({
  item,
  highlighted,
  dragging,
  editable,
  saving,
  label,
  futureDoctor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  item: LocalItem;
  highlighted: boolean;
  dragging: boolean;
  editable: boolean;
  saving: boolean;
  label: string;
  futureDoctor: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!editable}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`hq-placed absolute touch-none select-none ${highlighted ? "hq-item-glow" : ""} ${
        dragging ? "hq-placed-dragging" : ""
      } ${editable ? "hq-placed-editable cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}%`,
        zIndex: item.zIndex,
        transform: "translate(-50%, -50%)",
        viewTransitionName: `store-item-${item.slotKey}`,
      }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          draggable={false}
          className="pointer-events-none h-auto w-full object-contain drop-shadow-[0_10px_14px_rgba(26,43,71,0.28)]"
        />
      ) : (
        <span className="block aspect-square rounded-2xl bg-white/80" />
      )}
      {item.slotKey === "stethoscope" ? (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-primary-orange shadow-sm">
          {futureDoctor}
        </span>
      ) : null}
      {saving ? (
        <span className="absolute -top-2 end-0 h-2.5 w-2.5 rounded-full bg-primary-orange" aria-hidden="true" />
      ) : null}
    </button>
  );
}
