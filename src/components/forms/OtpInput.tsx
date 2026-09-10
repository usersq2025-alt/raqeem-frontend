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
  digitLabel,
  groupLabel,
}: Props) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const groupId = useId();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const start = Math.min(valueRef.current.length, OTP_LENGTH - 1);
    inputsRef.current[start]?.focus();
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (pulseIndex === null) return;
    const timer = window.setTimeout(() => setPulseIndex(null), 220);
    return () => window.clearTimeout(timer);
  }, [pulseIndex]);

  function focusAt(index: number) {
    const clamped = Math.max(0, Math.min(index, OTP_LENGTH - 1));
    const node = inputsRef.current[clamped];
    node?.focus();
    node?.select();
  }

  function commit(next: string, pulse?: number) {
    const clipped = onlyDigits(next).slice(0, OTP_LENGTH);
    onChange(clipped);
    if (pulse !== undefined && clipped[pulse]) {
      setPulseIndex(pulse);
    }
    if (clipped.length === OTP_LENGTH && clipped !== valueRef.current) {
      onComplete?.(clipped);
    }
  }

  function applyFilled(raw: string, fromIndex: number) {
    const incoming = onlyDigits(raw).slice(0, OTP_LENGTH);
    if (!incoming) return;
    const prefix = value.slice(0, fromIndex);
    const merged = onlyDigits(`${prefix}${incoming}`).slice(0, OTP_LENGTH);
    const lastFilled = Math.max(0, merged.length - 1);
    commit(merged, lastFilled);
    focusAt(merged.length >= OTP_LENGTH ? OTP_LENGTH - 1 : merged.length);
  }

  return (
    <div
      role="group"
      aria-labelledby={groupId}
      aria-describedby={describedBy}
      aria-invalid={error || undefined}
      className={shake ? "animate-otp-shake" : undefined}
    >
      <p id={groupId} className="sr-only">
        {groupLabel}
      </p>
      <div dir={isRtl ? "rtl" : "ltr"} className="flex justify-center gap-2.5 sm:gap-3">
        {digits.map((digit, index) => {
          const isFilled = digit !== "";
          const isPulsing = pulseIndex === index;

          return (
            <input
              key={index}
              ref={(node) => {
                inputsRef.current[index] = node;
              }}
              id={`${groupId}-${index}`}
              name={`otp-${index}`}
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              aria-label={digitLabel(index + 1)}
              aria-invalid={error || undefined}
              disabled={disabled}
              value={digit}
              onChange={(event) => {
                const next = onlyDigits(event.target.value);
                if (next.length > 1) {
                  applyFilled(next, index);
                  return;
                }
                if (next.length === 1) {
                  const updated = `${value.slice(0, index)}${next}${value.slice(index + 1)}`;
                  commit(updated, index);
                  if (index < OTP_LENGTH - 1) {
                    focusAt(index + 1);
                  }
                  return;
                }
                commit(`${value.slice(0, index)}${value.slice(index + 1)}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace") {
                  if (digit) {
                    return;
                  }
                  event.preventDefault();
                  if (index > 0) {
                    commit(`${value.slice(0, index - 1)}${value.slice(index)}`);
                    focusAt(index - 1);
                  }
                  return;
                }

                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  focusAt(index + (isRtl ? 1 : -1));
                  return;
                }

                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  focusAt(index + (isRtl ? -1 : 1));
                }
              }}
              onPaste={(event) => {
                event.preventDefault();
                applyFilled(event.clipboardData.getData("text"), index);
              }}
              onFocus={(event) => {
                if (index > value.length) {
                  focusAt(value.length);
                  return;
                }
                event.currentTarget.select();
              }}
              className={[
                "h-[3.65rem] w-[3.35rem] rounded-2xl border-2 bg-[#F7F4F0] text-center text-[1.65rem] font-black text-text-navy outline-none transition-[border-color,box-shadow,transform,background-color] duration-150 sm:h-[3.9rem] sm:w-[3.6rem] sm:text-[1.85rem]",
                "caret-primary-orange",
                disabled ? "cursor-not-allowed opacity-60" : "",
                error
                  ? "border-red-400 bg-red-50 text-red-800 shadow-[0_0_0_3px_rgba(220,38,38,0.16)]"
                  : "border-[#E7DFD6] focus:border-primary-orange focus:bg-white focus:shadow-[0_0_0_4px_rgba(244,130,50,0.28)]",
                isFilled && !error ? "border-primary-orange/70 bg-white" : "",
                isPulsing ? "animate-otp-pop" : "",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
