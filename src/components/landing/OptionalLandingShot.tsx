"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  placeholderTitle: string;
  placeholderHint: string;
  filenameHint: string;
};

/**
 * Shows a calm placeholder until the PNG exists at `src`.
 * Drop the file into `public/images/landing/` with the documented name — it appears automatically.
 */
export function OptionalLandingShot({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  placeholderTitle,
  placeholderHint,
  filenameHint,
}: Props) {
  const [status, setStatus] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setStatus("ready");
    };
    probe.onerror = () => {
      if (!cancelled) setStatus("missing");
    };
    probe.src = `${src}?v=${Date.now()}`;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (status === "ready") {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
        unoptimized
      />
    );
  }

  return (
    <div
      className="flex aspect-[5/4] w-full flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-brand-navy/20 bg-gradient-to-br from-[#F3F8FF] via-[#FFF8EF] to-[#F4FBF8] px-6 text-center"
      role="img"
      aria-label={placeholderTitle}
    >
      {status === "checking" ? (
        <p className="text-sm font-bold text-brand-navy/50">…</p>
      ) : (
        <>
          <p className="text-base font-extrabold text-brand-navy-dark sm:text-lg">{placeholderTitle}</p>
          <p className="max-w-[28ch] font-body text-sm font-medium leading-relaxed text-brand-navy/65 sm:text-[0.95rem]">
            {placeholderHint}
          </p>
          <code className="mt-1 rounded-lg bg-white/80 px-2.5 py-1 font-data text-xs font-bold text-brand-navy/80">
            {filenameHint}
          </code>
        </>
      )}
    </div>
  );
}
