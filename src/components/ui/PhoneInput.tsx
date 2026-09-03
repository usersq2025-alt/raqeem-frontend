"use client";

import { COUNTRY_CODES } from "@/config/phone";
import { FieldInput, PhoneIcon } from "@/components/ui/FieldInput";

type Props = {
  id: string;
  country: string;
  number: string;
  placeholder: string;
  countryLabel: string;
  invalid?: boolean;
  describedBy?: string;
  onCountryChange: (value: string) => void;
  onNumberChange: (value: string) => void;
};

export function PhoneInput({
  id,
  country,
  number,
  placeholder,
  countryLabel,
  invalid,
  describedBy,
  onCountryChange,
  onNumberChange,
}: Props) {
  return (
    <div className="flex gap-2" dir="ltr">
      <label className="sr-only" htmlFor={`${id}-country`}>
        {countryLabel}
      </label>
      <select
        id={`${id}-country`}
        value={country}
        onChange={(event) => onCountryChange(event.target.value)}
        className="min-w-[6.5rem] rounded-xl border border-neutral-200 bg-white px-2 py-3 text-sm font-semibold text-text-navy outline-none focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20"
      >
        {COUNTRY_CODES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.code}
          </option>
        ))}
      </select>
      <div className="min-w-0 flex-1">
        <FieldInput
          id={id}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          placeholder={placeholder}
          icon={<PhoneIcon />}
          invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onNumberChange(event.target.value)}
        />
      </div>
    </div>
  );
}
