"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { birthDateBounds, daysInMonth, isBirthComponentsAllowed } from "@/lib/validation/childSchema";

type Phase = "year" | "month" | "day" | "summary";

type WheelItem = {
  value: number;
  label: string;
  disabled?: boolean;
};

type Props = {
  id: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
};

function parseIso(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BirthDatePicker({ id, value, invalid, onChange }: Props) {
  const t = useTranslations("child.birthPicker");
  const monthNames = t.raw("months") as string[];

  const bounds = useMemo(() => birthDateBounds(), []);
  const rangeStartYear = 2000;
  const rangeEndYear = useMemo(() => new Date().getFullYear(), []);

  const initial = useMemo(() => parseIso(value), [value]);
  const [phase, setPhase] = useState<Phase>(initial ? "summary" : "year");
  const [year, setYear] = useState<number | null>(initial?.year ?? null);
  const [month, setMonth] = useState<number | null>(initial?.month ?? null);
  const [day, setDay] = useState<number | null>(initial?.day ?? null);
  const [wheelMoving, setWheelMoving] = useState(false);

  const yearItems = useMemo<WheelItem[]>(() => {
    const items: WheelItem[] = [];
    for (let y = rangeStartYear; y <= rangeEndYear; y++) {
      items.push({ value: y, label: String(y), disabled: !isBirthComponentsAllowed(y) });
    }
    return items;
  }, [rangeEndYear]);

  const monthItems = useMemo<WheelItem[]>(() => {
    if (year == null) return [];
    const items: WheelItem[] = [];
    for (let m = 1; m <= 12; m++) {
      items.push({
        value: m,
        label: `${monthNames[m - 1] ?? m} (${m})`,
        disabled: !isBirthComponentsAllowed(year, m),
      });
    }
    return items;
  }, [year, monthNames]);

  const dayItems = useMemo<WheelItem[]>(() => {
    if (year == null || month == null) return [];
    const total = daysInMonth(year, month);
    const items: WheelItem[] = [];
    for (let d = 1; d <= total; d++) {
      items.push({ value: d, label: String(d), disabled: !isBirthComponentsAllowed(year, month, d) });
    }
    return items;
  }, [year, month]);

  function handleYearSettle(y: number) {
    if (y === year) return;
    setYear(y);
    setMonth((m) => (m != null && isBirthComponentsAllowed(y, m) ? m : null));
    setDay(null);
  }

  function handleMonthSettle(m: number) {
    if (year == null) return;
    if (m === month) return;
    setMonth(m);
    setDay((d) => (d != null && isBirthComponentsAllowed(year, m, d) ? d : null));
  }

  function handleDaySettle(d: number) {
    if (year == null || month == null) return;
    setDay(d);
  }

  function confirmSelection() {
    if (phase === "year" && year != null && isBirthComponentsAllowed(year)) {
      setPhase("month");
    } else if (phase === "month" && year != null && month != null && isBirthComponentsAllowed(year, month)) {
      setPhase("day");
    } else if (phase === "day" && year != null && month != null && day != null && isBirthComponentsAllowed(year, month, day)) {
      onChange(toIso(year, month, day));
      setPhase("summary");
    }
  }

  function reopen() {
    setWheelMoving(false);
    setPhase("year");
  }

  function goBack(target: Phase) {
    setWheelMoving(false);
    setPhase(target);
  }

  const minYear = bounds.min.getFullYear();
  const maxYear = bounds.max.getFullYear();

  if (phase === "summary" && year != null && month != null && day != null) {
    return (
      <div>
        <button
          type="button"
          id={id}
          onClick={reopen}
          aria-invalid={invalid || undefined}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white py-3 ps-4 pe-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20 ${
            invalid ? "border-red-400" : "border-neutral-200"
          }`}
        >
          <span className="flex items-center gap-2 font-bold text-text-navy">
            <CalendarCheckIcon />
            {t("summary", { day, month: `${monthNames[month - 1] ?? month} (${month})`, year })}
          </span>
          <span className="flex items-center gap-1 text-xs font-extrabold text-primary-orange">
            <PencilIcon />
            {t("edit")}
          </span>
        </button>
      </div>
    );
  }

  const hint =
    phase === "year"
      ? year != null
        ? t("yearSelected", { year })
        : t("dragYear")
      : phase === "month"
        ? month != null
          ? `${monthNames[month - 1] ?? month} (${month})`
          : t("dragMonth")
        : day != null
          ? t("daySelected", { day })
          : t("dragDay");

  return (
    <div
      key={phase}
      id={id}
      className={`date-step-enter rounded-[22px] border-2 bg-[#FBFAF8] p-3 ${
        invalid ? "border-red-300" : "border-neutral-100"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        {phase !== "year" ? (
          <button
            type="button"
            onClick={() => goBack(phase === "month" ? "year" : "month")}
            className="inline-flex items-center gap-1 rounded-full py-1 pe-2 text-xs font-bold text-text-gray transition-colors hover:text-primary-orange"
          >
            <BackChevron />
            {t("back")}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <StepDots phase={phase} hasYear={year != null} hasMonth={month != null} />
      </div>

      <p aria-live="polite" className="text-center text-[13px] font-extrabold text-text-navy">
        {hint}
      </p>

      <WheelStrip
        key={phase === "year" ? "y" : phase === "month" ? `m-${year}` : `d-${year}-${month}`}
        items={phase === "year" ? yearItems : phase === "month" ? monthItems : dayItems}
        selected={phase === "year" ? year : phase === "month" ? month : day}
        onSettle={phase === "year" ? handleYearSettle : phase === "month" ? handleMonthSettle : handleDaySettle}
        ariaLabel={
          phase === "year"
            ? t("aria.year")
            : phase === "month"
              ? t("aria.month")
              : t("aria.day")
        }
        wide={phase === "month"}
        onMovingChange={setWheelMoving}
      />

      {phase === "year" ? (
        <p className="mt-1 text-center text-[11px] font-medium text-text-gray">
          {t("rangeHint", { min: minYear, max: maxYear })}
        </p>
      ) : null}
      <button
        type="button"
        onClick={confirmSelection}
        disabled={wheelMoving || (phase === "year" ? year == null : phase === "month" ? month == null : day == null)}
        className="mt-3 w-full rounded-xl bg-primary-orange px-4 py-2.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t(phase === "year" ? "confirmYear" : phase === "month" ? "confirmMonth" : "confirmDate")}
      </button>
    </div>
  );
}

function StepDots({
  phase,
  hasYear,
  hasMonth,
}: {
  phase: Phase;
  hasYear: boolean;
  hasMonth: boolean;
}) {
  const steps: Array<{ key: Phase; done: boolean }> = [
    { key: "year", done: hasYear },
    { key: "month", done: hasMonth },
    { key: "day", done: false },
  ];
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {steps.map((step) => (
        <span
          key={step.key}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            step.key === phase
              ? "w-4 bg-primary-orange"
              : step.done
                ? "w-1.5 bg-primary-orange/50"
                : "w-1.5 bg-neutral-200"
          }`}
        />
      ))}
    </div>
  );
}

function WheelStrip({
  items,
  selected,
  onSettle,
  ariaLabel,
  wide,
  onMovingChange,
}: {
  items: WheelItem[];
  selected: number | null;
  onSettle: (value: number) => void;
  ariaLabel: string;
  wide?: boolean;
  onMovingChange: (moving: boolean) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const settleTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const suppressSettleRef = useRef(true);
  // Read once client-side in a layout effect (never at render time — the
  // server render has no `document`/computed style to check, so doing this
  // eagerly during render would create a hydration mismatch for RTL locales).
  // Kept as state (not a ref) so the one layout-effect correction re-renders
  // synchronously before paint, and the arrow-disabled/keyboard direction
  // logic below always reflects the real value.
  const [isRtl, setIsRtl] = useState(false);

  const initialIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.value === selected);
    return idx >= 0 ? idx : Math.floor(items.length / 2);
  }, [items, selected]);
  const [focusIndex, setFocusIndex] = useState(initialIndex);

  useEffect(() => () => {
    if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setIsRtl(getComputedStyle(scroller).direction === "rtl");

    function layout() {
      if (!scroller) return;
      const first = itemRefs.current.get(0);
      if (!first) return;
      const side = Math.max(0, scroller.clientWidth / 2 - first.clientWidth / 2);
      scroller.style.paddingInlineStart = `${side}px`;
      scroller.style.paddingInlineEnd = `${side}px`;
      const target = itemRefs.current.get(initialIndex);
      target?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      applyScales();
    }

    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plain vertical mouse wheels only report deltaY, and React attaches its
  // onWheel prop as a passive listener (preventDefault is a no-op there), so a
  // native, non-passive listener is the only way to actually hijack the wheel
  // and redirect it into the horizontal strip instead of scrolling the page.
  // Trackpad two-finger swipes already produce deltaX and scroll the strip
  // natively with no help needed here.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    function handleWheel(event: WheelEvent) {
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (raw === 0 || !scroller) return;
      event.preventDefault();
      // scrollLeft's sign convention for "forward" flips between the LTR and
      // RTL scroll models, so the same wheel direction needs an opposite sign
      // to always mean "move forward" either way.
      scroller.scrollLeft += isRtl ? -raw : raw;
    }
    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", handleWheel);
  }, [isRtl]);

  function applyScales() {
    const scroller = scrollerRef.current;
    if (!scroller) return { nearestIndex: focusIndex };
    const rect = scroller.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    let nearestIndex = 0;
    let nearestDist = Infinity;
    itemRefs.current.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const itemCenter = r.left + r.width / 2;
      const dist = Math.abs(itemCenter - centerX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = idx;
      }
      const norm = Math.min(dist / (rect.width / 2 || 1), 1.6);
      const scale = Math.max(0.78, Math.min(1.16, 1.16 - norm * 0.36));
      const opacity = Math.max(0.42, Math.min(1, 1.04 - norm * 0.52));
      el.style.transform = `scale(${scale})`;
      el.style.opacity = `${opacity}`;
    });
    return { nearestIndex };
  }

  function onScroll() {
    onMovingChange(true);
    if (rafRef.current == null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        applyScales();
      });
    }
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null;
      onMovingChange(false);
      const { nearestIndex } = applyScales();
      if (suppressSettleRef.current) {
        suppressSettleRef.current = false;
        setFocusIndex(nearestIndex);
        return;
      }
      setFocusIndex(nearestIndex);
      const item = items[nearestIndex];
      if (item && !item.disabled) onSettle(item.value);
    }, 140);
  }

  function centerIndex(idx: number, behavior: ScrollBehavior = "smooth") {
    const el = itemRefs.current.get(idx);
    el?.scrollIntoView({ behavior, inline: "center", block: "nearest" });
  }

  function selectIndex(idx: number) {
    const item = items[idx];
    if (!item || item.disabled) return;
    setFocusIndex(idx);
    // The programmatic smooth-scroll below fires its own 'scroll' events, which
    // would otherwise re-trigger the settle debounce in onScroll and call
    // onSettle a second time once the animation lands. Suppress that one.
    suppressSettleRef.current = true;
    centerIndex(idx);
    onSettle(item.value);
  }

  function nextEnabledIndex(from: number, dir: 1 | -1) {
    let idx = from + dir;
    while (idx >= 0 && idx < items.length) {
      if (!items[idx]?.disabled) return idx;
      idx += dir;
    }
    return null;
  }

  // Mouse click-and-drag panning. Touch already scrolls natively (handled by
  // the browser) so this only engages for mouse/pen pointers. Content should
  // track the cursor like a dragged sheet of paper: dragging right always
  // reveals earlier items. Because the LTR and RTL scroll models put "start"
  // at opposite ends of the scrollLeft range, the same cursor movement needs
  // an opposite sign on scrollLeft depending on direction.
  const dragState = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const suppressClickRef = useRef(false);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: scroller.scrollLeft };
    scroller.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    const scroller = scrollerRef.current;
    if (!drag || !scroller || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 4) suppressClickRef.current = true;
    scroller.scrollLeft = drag.startScrollLeft + (isRtl ? delta : -delta);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    scrollerRef.current?.releasePointerCapture(event.pointerId);
    dragState.current = null;
    // A manual pointer drag doesn't get the browser's native scroll-snap
    // momentum/settle (that only kicks in for real touch/wheel gestures), so
    // explicitly snap to whichever card ended up nearest the center.
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    onMovingChange(false);
    const { nearestIndex } = applyScales();
    selectIndex(nearestIndex);
  }

  function moveByVisualDirection(visualDir: 1 | -1) {
    const logicalDir: 1 | -1 = isRtl ? ((-visualDir) as 1 | -1) : visualDir;
    const idx = nextEnabledIndex(focusIndex, logicalDir);
    if (idx != null) selectIndex(idx);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveByVisualDirection(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveByVisualDirection(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = nextEnabledIndex(-1, 1);
      if (first != null) selectIndex(first);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = nextEnabledIndex(items.length, -1);
      if (last != null) selectIndex(last);
    } else if ((event.key === "Enter" || event.key === " ") && idx !== focusIndex) {
      event.preventDefault();
      selectIndex(idx);
    }
  }

  // Flex places the first arrow on the right in RTL, alongside the earlier
  // items. Match its movement and disabled state to that physical position.
  const hasPrevious = nextEnabledIndex(focusIndex, -1) != null;
  const hasNext = nextEnabledIndex(focusIndex, 1) != null;

  return (
    <div className="mt-1.5 flex items-center gap-1">
      <WheelArrow direction="previous" disabled={!hasPrevious} onClick={() => moveByVisualDirection(isRtl ? 1 : -1)} />
      <div
        ref={scrollerRef}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={-1}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="wheel-scroll flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth py-2 cursor-grab active:cursor-grabbing"
      >
        {items.map((item, idx) => {
          const isFocused = idx === focusIndex;
          return (
            <button
              key={item.value}
              ref={(el) => {
                if (el) itemRefs.current.set(idx, el);
                else itemRefs.current.delete(idx);
              }}
              type="button"
              role="option"
              aria-selected={isFocused}
              aria-disabled={item.disabled || undefined}
              disabled={item.disabled}
              tabIndex={isFocused ? 0 : -1}
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                selectIndex(idx);
              }}
              onKeyDown={(event) => onKeyDown(event, idx)}
              className={`date-wheel-item flex shrink-0 snap-center items-center justify-center rounded-[18px] border-2 font-extrabold outline-none transition-colors duration-200 ${
                wide ? "h-14 w-28 text-sm" : "h-14 w-14 text-base"
              } ${
                item.disabled
                  ? "border-transparent bg-neutral-100 text-neutral-300"
                  : isFocused
                    ? "date-wheel-focused border-primary-orange bg-orange-50 text-primary-orange"
                    : "border-neutral-100 bg-white text-text-navy focus-visible:border-primary-orange/60"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <WheelArrow direction="next" disabled={!hasNext} onClick={() => moveByVisualDirection(isRtl ? -1 : 1)} />
    </div>
  );
}

function WheelArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      tabIndex={-1}
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-text-gray shadow-[0_6px_16px_-10px_rgba(26,43,71,0.5)] transition-transform hover:text-primary-orange active:scale-90 disabled:pointer-events-none disabled:opacity-30"
    >
      <ChevronIcon dir={direction} />
    </button>
  );
}

function ChevronIcon({ dir }: { dir: "previous" | "next" }) {
  const rotate = dir === "previous" ? "rotate-0 rtl:rotate-180" : "rotate-180 rtl:rotate-0";
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${rotate}`} fill="none" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 rotate-90 rtl:-rotate-90" fill="none" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-orange" fill="none" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 4v3M16 4v3M4.5 10h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 14.2 11 16.2 15.5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M14.2 5.2 18.8 9.8 8.6 20 4 20.5 4.5 15.9 14.2 5.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
