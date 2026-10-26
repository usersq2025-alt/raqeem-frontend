"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/registerSchema";

type Props = {
  id: string;
  name: string;
  value: string;
  placeholder: string;
  autoComplete?: string;
  invalid?: boolean;
  showStrength?: boolean;
  describedBy?: string;
  variant?: "default" | "soft";
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function PasswordInput({
  id,
  name,
  value,
  placeholder,
  autoComplete = "new-password",
  invalid,
  showStrength = false,
  describedBy,
  variant = "default",
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const t = useTranslations("register.strength");
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <FieldInput
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        invalid={invalid}
        variant={variant}
        icon={<LockIcon />}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        trailing={
          <button
            type="button"
            className="rounded-md p-2.5 text-neutral-600 transition-colors hover:text-text-navy"
            aria-label={visible ? t("hide") : t("show")}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      {showStrength && focused && !invalid ? (
        <p id={`${id}-strength`} className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
          <span aria-hidden="true">{value.length >= MIN_PASSWORD_LENGTH ? "✓" : "•"}</span>
          {t("required")}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 5l16 14M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.6-1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.2 8.2C4.4 9.6 3 12 3 12s3.5 6 9 6c1.6 0 3-.3 4.2-.8M17.5 14.5C19.2 13.2 21 12 21 12s-3.5-6-9-6c-.7 0-1.4.1-2 .2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
