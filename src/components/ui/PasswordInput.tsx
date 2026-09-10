"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import {
  getPasswordRules,
  getPasswordStrength,
  type PasswordRuleId,
} from "@/lib/validation/registerSchema";

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

const RULE_ORDER: PasswordRuleId[] = ["length", "upper", "lower", "digit"];

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
  const strength = getPasswordStrength(value);
  const rules = getPasswordRules(value);
  const showRules = showStrength && (focused || value.length > 0);
  const labels = ["", t("weak"), t("medium"), t("strong")] as const;
  const barColors = [
    "bg-neutral-200",
    "bg-orange-400",
    "bg-amber-400",
    "bg-emerald-500",
  ] as const;

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
            className="rounded-md p-1 text-neutral-400 transition-colors hover:text-text-navy"
            aria-label={visible ? t("hide") : t("show")}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      {showRules ? (
        <div className="mt-2.5" id={`${id}-strength`}>
          {value ? (
            <div className="mb-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      strength >= level ? barColors[strength] : "bg-neutral-200"
                    }`}
                  />
                ))}
              </div>
              <span
                className={`text-xs font-bold ${
                  strength === 3
                    ? "text-emerald-600"
                    : strength === 2
                      ? "text-amber-600"
                      : "text-text-gray"
                }`}
              >
                {labels[strength]}
              </span>
            </div>
          ) : null}
          <p className="sr-only">{t("rulesTitle")}</p>
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs font-bold">
            {RULE_ORDER.map((rule, index) => {
              const met = rules[rule];
              return (
                <li key={rule} className="inline-flex items-center gap-1">
                  {index > 0 ? (
                    <span className="px-0.5 text-neutral-300" aria-hidden="true">
                      |
                    </span>
                  ) : null}
                  <span className={met ? "text-emerald-600" : "text-text-gray"}>
                    {t(`short.${rule}`)} {met ? "✓" : "✗"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
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
