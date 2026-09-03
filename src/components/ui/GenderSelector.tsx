"use client";

import Image from "next/image";
import type { ChildGender } from "@/lib/api/children";

type Option = {
  value: ChildGender;
  label: string;
  imageSrc: string;
  imageAlt: string;
};

type Props = {
  value: ChildGender | null;
  onChange: (value: ChildGender) => void;
  groupLabel: string;
  invalid?: boolean;
  femaleLabel: string;
  maleLabel: string;
  femaleAlt: string;
  maleAlt: string;
};

export function GenderSelector({
  value,
  onChange,
  groupLabel,
  invalid,
  femaleLabel,
  maleLabel,
  femaleAlt,
  maleAlt,
}: Props) {
  const options: Option[] = [
    {
      value: "female",
      label: femaleLabel,
      imageSrc: "/images/child/girl.png",
      imageAlt: femaleAlt,
    },
    {
      value: "male",
      label: maleLabel,
      imageSrc: "/images/child/boy.png",
      imageAlt: maleAlt,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      aria-invalid={invalid || undefined}
      className="grid grid-cols-2 gap-3"
    >
      {options.map((option) => {
        const selected = value === option.value;
        const tint =
          option.value === "female"
            ? "from-rose-50 to-orange-50"
            : "from-sky-50 to-violet-50";

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`gender-card relative flex flex-col items-center overflow-hidden rounded-[22px] border-2 px-2 pb-3 pt-4 transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out ${
              selected
                ? `gender-card-selected border-primary-orange bg-gradient-to-b ${tint} shadow-[0_10px_24px_-16px_rgba(244,130,50,0.9)]`
                : `border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-primary-orange/50 hover:shadow-[0_12px_24px_-18px_rgba(26,43,71,0.35)] ${
                    invalid ? "border-red-300" : ""
                  }`
            }`}
          >
            <span
              className={`absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-orange text-white shadow-sm transition-[transform,opacity] duration-300 ${
                selected ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                <path
                  d="M3.6 8.2 6.5 11l6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="relative h-[7.25rem] w-[7.25rem] sm:h-32 sm:w-32">
              <span
                className={`absolute inset-6 rounded-full blur-2xl transition-opacity duration-300 ${
                  selected
                    ? option.value === "female"
                      ? "bg-rose-200/70 opacity-100"
                      : "bg-sky-200/70 opacity-100"
                    : "opacity-0"
                }`}
                aria-hidden="true"
              />
              <Image
                src={option.imageSrc}
                alt={option.imageAlt}
                width={256}
                height={256}
                className={`relative z-[1] h-full w-full object-contain object-bottom transition-transform duration-300 ${
                  selected ? "scale-[1.04]" : "scale-100"
                }`}
              />
            </span>
            <span className="mt-1 text-sm font-bold text-text-navy">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
