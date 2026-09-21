"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";

export const OTP_LENGTH = 4;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  shake?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
  digitLabel: (index: number) => string;
  groupLabel: string;
};

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error = false,
  shake = false,
  disabled = false,
  autoFocus = true,
  describedBy,
  groupLabel,
}: Props) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const groupId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (pulseIndex === null) return;
    const timer = window.setTimeout(() => setPulseIndex(null), 220);
    return () => window.clearTimeout(timer);
  }, [pulseIndex]);

  function commit(nextRaw: string) {
    const clipped = onlyDigits(nextRaw).slice(0, OTP_LENGTH);
    if (clipped === value) return;

    onChange(clipped);

    if (clipped.length > value.length) {
      setPulseIndex(clipped.length - 1);
    }

    if (clipped.length === OTP_LENGTH) {
      onComplete?.(clipped);
    }
  }

  return (
    <div
      className={shake ? "animate-otp-shake" : undefined}
    >
      <div
        className="relative mx-auto w-fit"
        onPointerDown={() => {
          if (!disabled) inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <input
          ref={inputRef}
          id={groupId}
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          dir="ltr"
          lang="en"
          aria-label={groupLabel}
          aria-describedby={describedBy}
          aria-invalid={error || undefined}
          disabled={disabled}
          value={value}
          onChange={(event) => commit(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 z-10 h-full w-full cursor-text touch-manipulation opacity-0 disabled:cursor-not-allowed"
          style={{ fontSize: 16, color: "transparent", caretColor: "transparent" }}
        />

        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="pointer-events-none flex justify-center gap-2.5 sm:gap-3"
          aria-hidden="true"
        >
          {digits.map((digit, index) => {
            const isFilled = digit !== "";
            const isActive = focused && !disabled && index === activeIndex;
            const isPulsing = pulseIndex === index;

            return (
              <span
                key={index}
                className={[
                  "inline-flex h-[3.65rem] w-[3.35rem] items-center justify-center rounded-2xl border-2 text-[1.65rem] font-black text-text-navy transition-[border-color,box-shadow,background-color] duration-150 sm:h-[3.9rem] sm:w-[3.6rem] sm:text-[1.85rem]",
                  disabled ? "opacity-60" : "",
                  error
                    ? "border-red-400 bg-red-50 text-red-800 shadow-[0_0_0_3px_rgba(220,38,38,0.16)]"
                    : isActive
                      ? "border-primary-orange bg-white shadow-[0_0_0_4px_rgba(244,130,50,0.28)]"
                      : isFilled
                        ? "border-primary-orange/70 bg-white"
                        : "border-[#E7DFD6] bg-[#F7F4F0]",
                  isPulsing ? "animate-otp-pop" : "",
                ].join(" ")}
              >
                {digit}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
