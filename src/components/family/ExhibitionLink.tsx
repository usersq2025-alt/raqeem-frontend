"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getParentAccount } from "@/lib/api/parentAccount";

export function ExhibitionLink() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    getParentAccount().then((account) => {
      if (active) setEnabled(account.exhibitionMode && account.email === "raqeem2026@gmail.com");
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!enabled) return null;
  return <Link href="/family/exhibition" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-orange px-5 py-2 text-sm font-extrabold text-white shadow-sm hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange">تبويب المعرض</Link>;
}
