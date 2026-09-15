import type { StationVisualState } from "@/components/path/types";

type Props = {
  title: string;
  state: StationVisualState;
  /** Prefer label on the open side of the zigzag so it stays on-screen. */
  side: "start" | "end";
};

export function LessonLabel({ title, state, side }: Props) {
  const tone =
    state === "locked"
      ? "bg-white/75 text-[#8B95A5]"
      : state === "current"
        ? "bg-white text-text-navy shadow-md ring-2 ring-emerald-200/80"
        : "bg-white/90 text-text-navy";

  return (
    <p
      className={`path-lesson-label pointer-events-none absolute top-1/2 z-[5] max-w-[7.5rem] -translate-y-1/2 rounded-2xl px-3 py-1.5 text-center text-[12px] font-extrabold leading-snug sm:max-w-[9rem] sm:text-[13px] ${tone} ${
        side === "start" ? "end-[calc(100%+0.55rem)]" : "start-[calc(100%+0.55rem)]"
      }`}
    >
      {title}
    </p>
  );
}
