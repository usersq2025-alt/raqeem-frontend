export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M12 3.2 14.2 8.4l5.6.5-4.2 3.6 1.3 5.5L12 15.4 7.1 18l1.3-5.5L4.2 8.9l5.6-.5L12 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={[className ?? "h-5 w-5", "rtl:rotate-180"].filter(Boolean).join(" ")}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h12.5M13 6.5 18.5 12 13 17.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M12 3.5 19 7v5.2c0 4.4-3 7.6-7 8.8-4-1.2-7-4.4-7-8.8V7l7-3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.2 12.2 11 14l3.8-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21V5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5 18.2h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function GiftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v10M4 14h16" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 10c-2.2-3.5-5.5-3.2-5.5-1.2S9.5 11 12 10c2.2-3.5 5.5-3.2 5.5-1.2S14.5 11 12 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 18.5c.8-2.8 2.9-4.2 5.5-4.2s4.7 1.4 5.5 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 14.5c1.7.3 3.1 1.3 3.8 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M12 3.5v3.2M12 17.3v3.2M4.8 12H8M16 12h3.2M6.6 6.6l2.2 2.2M15.2 15.2l2.2 2.2M17.4 6.6l-2.2 2.2M8.8 15.2l-2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ChildStepIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <circle cx="10" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.2 19c.9-3 2.8-4.6 5.8-4.6 1.4 0 2.6.4 3.5 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M17.2 12.2v6.2M14.1 15.3h6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CareerStepIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M8 9.2V7.4A2.2 2.2 0 0 1 10.2 5.2h3.6A2.2 2.2 0 0 1 16 7.4v1.8"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect x="4.4" y="9.2" width="15.2" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.4 13.2h15.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 14.2 12.7 15.8l1.7.2-1.3 1.2.4 1.7L12 18.1l-1.5.8.4-1.7-1.3-1.2 1.7-.2L12 14.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReviewStepIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M12 6.2c-1.5-1.4-3.7-1.8-5.5-.8C4.8 6.4 4 8 4 9.7V18c1.8-1 4-.7 5.5.7L12 20.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.2c1.5-1.4 3.7-1.8 5.5-.8C19.2 6.4 20 8 20 9.7V18c-1.8-1-4-.7-5.5.7L12 20.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.2 11.2h2.4M8.2 14h1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BuildStepIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" aria-hidden="true">
      <path
        d="M12 3.8 13.1 6.4l2.8.3-2.1 1.9.6 2.7L12 9.9l-2.4 1.4.6-2.7-2.1-1.9 2.8-.3L12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 20.2h11.6M8 20.2v-5.2l4-3.2 4 3.2v5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M11 20.2v-2.6h2v2.6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
