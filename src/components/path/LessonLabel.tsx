import type { StationVisualState } from "@/components/path/types";

type Props = {
  title: string;
  state: StationVisualState;
  /** Prefer label on the open side of the zigzag so it stays on-screen. */
  side: "start" | "end";
};

const BORDER: Record<StationVisualState, string> = {
  completed: "border-[#5FBF6A]/55",
  current: "border-[#F4A03C]/65",
  locked: "border-[#94A3B8]/40",
};

/**
 * Unified lesson-name card — cream surface, status-tint border, max 2 lines.
 */
export function LessonLabel({ title, state, side }: Props) {
  const tone =
    state === "locked"
      ? "bg-[#FFFEF9]/88 text-[#6B7789]"
      : "bg-[#FFFEF9] text-[#1F3A5F]";

  return (
    <div
      title={title}
      className={[
        "path-lesson-label pointer-events-none absolute top-1/2 z-[5] -translate-y-1/2",
        "flex min-h-[48px] w-[132px] items-center justify-center rounded-[16px] border px-3 py-2",
        "shadow-[0_2px_8px_rgba(15,50,80,0.08)]",
        "md:min-h-[52px] md:w-[172px] md:rounded-[17px] md:px-4 md:py-2.5",
        tone,
        BORDER[state],
        side === "start" ? "end-[calc(100%+14px)] md:end-[calc(100%+16px)]" : "start-[calc(100%+14px)] md:start-[calc(100%+16px)]",
      ].join(" ")}
    >
      <p
        className={[
          "w-full text-center font-extrabold leading-snug",
          "text-[15px] md:text-[17px]",
          "line-clamp-2 break-words [overflow-wrap:anywhere]",
        ].join(" ")}
      >
        {title}
      </p>
    </div>
  );
}
