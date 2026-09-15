import Image from "next/image";

type Props = {
  iconUrl: string | null;
  accentColor: string;
  label: string;
};

/** Large unit symbol near the top of the path (goal / world entrance). */
export function PathTopIllustration({ iconUrl, accentColor, label }: Props) {
  return (
    <div className="pointer-events-none absolute start-1/2 top-[2%] z-[6] w-[40%] max-w-[10.5rem] -translate-x-1/2" aria-hidden="true">
      <div
        className="relative mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/80 to-white/45 p-2.5 ring-4 ring-white/75 backdrop-blur-[2px]"
        style={{
          boxShadow: `0 0 0 6px color-mix(in srgb, ${accentColor} 22%, transparent), 0 18px 36px -18px rgba(26,43,71,0.3)`,
        }}
      >
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt=""
            width={180}
            height={180}
            unoptimized
            className="h-[92%] w-[92%] object-contain drop-shadow-[0_8px_12px_rgba(26,43,71,0.14)]"
          />
        ) : (
          <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
            <circle cx="60" cy="60" r="48" fill={accentColor} opacity="0.2" />
            <circle cx="60" cy="52" r="22" fill={accentColor} />
            <ellipse cx="60" cy="88" rx="28" ry="14" fill={accentColor} opacity="0.85" />
            <circle cx="52" cy="48" r="3" fill="white" />
            <circle cx="68" cy="48" r="3" fill="white" />
            <path d="M52 58c4 5 12 5 16 0" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="mt-2 truncate text-center text-[11px] font-extrabold text-text-navy/70">{label}</p>
    </div>
  );
}
