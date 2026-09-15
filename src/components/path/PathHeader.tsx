import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  backHref: string;
  backLabel: string;
};

export function PathHeader({ title, backHref, backLabel }: Props) {
  return (
    <header className="path-sticky-header sticky top-0 z-40 px-3 pt-3">
      <div className="relative mx-auto flex h-12 max-w-lg items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_24px_-12px_rgba(26,43,71,0.35)] backdrop-blur-md md:max-w-xl">
        <Link
          href={backHref}
          className="absolute start-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-navy shadow-sm"
          aria-label={backLabel}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
            <path
              d="M14.5 6.5 9 12l5.5 5.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="max-w-[70%] truncate px-12 text-center text-base font-black text-text-navy">{title}</h1>
      </div>
    </header>
  );
}
