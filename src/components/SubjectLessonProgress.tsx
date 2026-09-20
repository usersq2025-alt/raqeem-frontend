type Props = {
  completed: number;
  total: number;
  percentage: number;
  fill: number;
  accent: string;
  label: string;
  className?: string;
  compact?: boolean;
};

/**
 * Visual lesson completion meter for subject cards / sidebar rows.
 * `fill` is the animated width % (parent drives motion for prefers-reduced-motion).
 */
export function SubjectLessonProgress({
  completed,
  total,
  percentage,
  fill,
  accent,
  label,
  className = "",
  compact = false,
}: Props) {
  const trackH = compact ? "h-1.5" : "h-2";
  const done = total > 0 && completed >= total;

  return (
    <span className={`flex w-full flex-col gap-1 ${className}`}>
      <span className="flex items-center gap-2">
        <span
          className={`subject-progress-track ${trackH} min-w-0 flex-1 overflow-hidden rounded-full bg-white/70`}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <span
            className="subject-progress-fill block h-full rounded-full"
            style={{
              width: `${fill}%`,
              background: done
                ? `linear-gradient(90deg, ${accent}, ${accent}cc)`
                : `linear-gradient(90deg, ${accent}dd, ${accent})`,
              boxShadow: fill > 0 ? `0 0 0 1px ${accent}22` : undefined,
            }}
          />
        </span>
        <span
          className={`shrink-0 font-extrabold tabular-nums ${compact ? "text-[10px]" : "text-[11px] sm:text-xs"}`}
          style={{ color: accent }}
        >
          {percentage}%
        </span>
      </span>
      <span
        className={`font-semibold text-text-gray ${
          compact ? "text-[10px] leading-tight" : "text-[11px] leading-tight sm:text-xs"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
