type Option<T extends string> = { value: T; label: string };

/** One-of-two choice (phone / email). Real radios: a screen reader hears "1 of 2, selected". */
export function MethodChoice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mb-3 min-w-0 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-sm font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text-navy ${
                selected ? "border-primary-orange bg-orange-50 text-text-navy" : "border-neutral-300 text-neutral-700"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span aria-hidden="true">{selected ? "✓" : ""}</span>
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Same footprint as MethodChoice, shown until the available methods are known, so nothing jumps. */
export function MethodChoiceSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div aria-hidden="true" data-auth-skeleton className={`flex flex-col gap-3 ${tall ? "min-h-[28rem]" : "min-h-[19rem]"}`}>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-11 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-11 animate-pulse rounded-xl bg-neutral-100" />
      </div>
      <div className="h-[4.5rem] animate-pulse rounded-2xl bg-neutral-100" />
      <div className="h-[4.5rem] animate-pulse rounded-2xl bg-neutral-100" />
      <div className="h-12 animate-pulse rounded-full bg-neutral-100" />
    </div>
  );
}
