import type { StationVisualState } from "@/components/path/types";

type Props = {
  title: string;
  state: StationVisualState;
  /** Prefer label on the open side of the zigzag so it stays on-screen. */
  side: "start" | "end";
  /** Only render the star row when a completed lesson has a star value. */
  showStars?: boolean;
  /** 0-3, only meaningful when showStars is true. */
  earnedStars?: number;
  starsAriaLabel?: string;
};

const BORDER: Record<StationVisualState, string> = {
  completed: "border-[#5FBF6A]/55",
  current: "border-[#F4A03C]/65",
  locked: "border-[#94A3B8]/40",
};

/**
 * Unified lesson-name card -- cream surface, status-tint border, max 2 lines.
 * When the lesson is completed and has a star rating, the stars render
 * inside this same card (below the title) instead of as a separate floating
 * badge next to the node.
 */
export function LessonLabel({
  title,
  state,
  side,
  showStars = false,
  earnedStars = 0,
  starsAriaLabel,
}: Props) {
  const tone =
    state === "locked"
      ? "bg-[#FFFEF9]/88 text-[#6B7789]"
      : "bg-[#FFFEF9] text-[#1F3A5F]";

  return (
    <div
      title={title}
      className={[
        "path-lesson-label pointer-events-none absolute top-1/2 z-[5] -translate-y-1/2",
        "flex w-[132px] flex-col items-center justify-center gap-1 rounded-[16px] border px-3 py-2",
        showStars ? "min-h-[62px] md:min-h-[68px]" : "min-h-[48px] md:min-h-[52px]",
        "shadow-[0_2px_8px_rgba(15,50,80,0.08)]",
        "md:w-[172px] md:rounded-[17px] md:px-4 md:py-2.5",
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
      {showStars ? (
        <div className="flex items-center gap-[3px] md:gap-1" aria-label={starsAriaLabel}>
          {[0, 1, 2].map((i) => (
            <StarIcon key={i} filled={i < earnedStars} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] md:h-[19px] md:w-[19px]" aria-hidden="true">
      <path
        d="M12 2.8L14.7 9.1L21.5 9.8L16.4 14.3L17.9 21L12 17.6L6.1 21L7.6 14.3L2.5 9.8L9.3 9.1L12 2.8Z"
        fill={filled ? "#F8C830" : "transparent"}
        stroke={filled ? "#E0A820" : "#C5B896"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
