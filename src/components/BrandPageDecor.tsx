type Props = {
  /** `full` = homepage; `compact` = shorter pages like contact */
  density?: "full" | "compact";
};

/**
 * Soft brand-inspired organic shapes + sparse gold dash clusters.
 * Pure CSS decoration — never interactive, never competing with content.
 */
export function BrandPageDecor({ density = "full" }: Props) {
  return (
    <div className="brand-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="brand-organic brand-organic-gold" />
      <span className="brand-organic brand-organic-blue" />
      <span className="brand-organic brand-organic-coral" />
      {density === "full" ? <span className="brand-organic brand-organic-teal" /> : null}
      {density === "full" ? <span className="brand-organic brand-organic-purple" /> : null}

      <span className="brand-dash-cluster brand-dash-a">
        <span className="brand-dash brand-dash-lg" />
        <span className="brand-dash brand-dash-md" />
        <span className="brand-dash brand-dash-sm" />
      </span>

      <span className="brand-dash-cluster brand-dash-b">
        <span className="brand-dash brand-dash-md" />
        <span className="brand-dash brand-dash-lg" />
      </span>

      {density === "full" ? (
        <span className="brand-dash-cluster brand-dash-c">
          <span className="brand-dash brand-dash-sm" />
          <span className="brand-dash brand-dash-md" />
          <span className="brand-dash brand-dash-lg" />
        </span>
      ) : null}
    </div>
  );
}
