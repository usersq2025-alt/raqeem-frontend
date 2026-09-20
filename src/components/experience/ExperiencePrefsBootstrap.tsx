"use client";

import { useEffect } from "react";
import { applyExperiencePrefsToDocument, readExperiencePrefs } from "@/lib/experience/experiencePrefs";

export function ExperiencePrefsBootstrap() {
  useEffect(() => {
    applyExperiencePrefsToDocument(readExperiencePrefs());

    function onStorage(event: StorageEvent) {
      if (event.key === "raqeem:experience-prefs") {
        applyExperiencePrefsToDocument(readExperiencePrefs());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
