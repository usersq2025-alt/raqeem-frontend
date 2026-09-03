import { forwardRef, type ComponentProps, type ReactNode } from "react";

type FieldInputProps = ComponentProps<"input"> & {
  icon: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
};

export const FieldInput = forwardRef<HTMLInputElement, FieldInputProps>(function FieldInput(
  { icon, trailing, invalid, className = "", ...props },
  ref
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400">
        {icon}
      </span>
      <input
        {...props}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`w-full rounded-xl border bg-white py-3 text-sm text-text-navy outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20 ${
          trailing ? "ps-11 pe-11" : "px-3 ps-11"
        } ${invalid ? "border-red-400" : "border-neutral-200"} ${className}`}
      />
      {trailing ? (
        <div className="absolute end-2 top-1/2 -translate-y-1/2">{trailing}</div>
      ) : null}
    </div>
  );
});

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 8l7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M8 4.5h8A1.5 1.5 0 0 1 17.5 6v12a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 18V6A1.5 1.5 0 0 1 8 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M10 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="8.2" fill="#F87171" />
      <path d="M10 6v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13.6" r="1" fill="white" />
    </svg>
  );
}
