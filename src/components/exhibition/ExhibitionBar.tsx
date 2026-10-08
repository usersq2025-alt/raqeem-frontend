"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { professionAvatarSrc } from "@/lib/config/professions";
import {
  EXHIBITION_STUDENT_NAME,
  GRADE_NAMES,
  loadExhibitionSession,
  startExhibitionSession,
  type ExhibitionProfession,
} from "@/lib/api/exhibitionSession";
import type { ChildProfile } from "@/lib/api/children";

type Panel = "grade" | "profession" | null;

const chip =
  "min-h-10 rounded-xl px-3 py-2 text-xs font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange disabled:opacity-40";

/**
 * Floating "exhibition mode" switcher shown only to the exhibition manager while the visiting student is open:
 * change grade, change profession, or start the next visitor in one tap.
 */
export function ExhibitionBar({ child }: { child: ChildProfile }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [professions, setProfessions] = useState<ExhibitionProfession[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (child.fullName !== EXHIBITION_STUDENT_NAME) return null;

  const gender = child.gender === "female" ? "female" : "male";
  const gradeLevel = child.gradeId;

  async function openPanel(next: Exclude<Panel, null>) {
    setPanel((current) => (current === next ? null : next));
    if (next === "profession" && professions.length === 0) {
      try {
        setProfessions((await loadExhibitionSession()).professions);
      } catch {
        setError("تعذّر تحميل المهن.");
      }
    }
  }

  async function switchTo(professionCode: string, level: number) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await startExhibitionSession({ professionCode, gradeLevel: level, gender, fresh: false });
      // Full reload: the shell, the journey and the store all depend on the student's grade and profession.
      // eslint-disable-next-line react-hooks/immutability, @next/next/no-location-assign-relative-destination
      window.location.href = `/${locale}/subjects?childId=${session.student_id}`;
    } catch {
      setError("تعذّر التبديل. حاول مجددًا.");
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="fixed end-2 top-2 z-[60] flex max-w-[calc(100vw-1rem)] flex-col items-end gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="min-h-9 rounded-full bg-text-navy/90 px-3 text-xs font-extrabold text-white shadow-md backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"
      >
        🎪 وضع المعرض
      </button>
      {open ? (
        <div className="w-[min(22rem,calc(100vw-1rem))] rounded-3xl border border-slate-100 bg-white p-3 shadow-xl">
          <div className="flex flex-wrap gap-2">
            <a href={`/${locale}/family/exhibition/live`} className={`${chip} bg-primary-orange text-white`}>
              🔄 زائر جديد
            </a>
            <button type="button" aria-pressed={panel === "grade"} onClick={() => void openPanel("grade")} className={`${chip} ${panel === "grade" ? "bg-text-navy text-white" : "bg-slate-100"}`}>
              تغيير الصف
            </button>
            <button type="button" aria-pressed={panel === "profession"} onClick={() => void openPanel("profession")} className={`${chip} ${panel === "profession" ? "bg-text-navy text-white" : "bg-slate-100"}`}>
              تغيير المهنة
            </button>
          </div>

          {panel === "grade" ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {GRADE_NAMES.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  disabled={busy}
                  onClick={() => void switchTo(child.professionCode ?? "doctor", index + 1)}
                  className={`${chip} ${gradeLevel === index + 1 ? "bg-primary-orange text-white" : "bg-slate-50"}`}
                >
                  الصف {name}
                </button>
              ))}
            </div>
          ) : null}

          {panel === "profession" ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {professions.map((row) => {
                const src = professionAvatarSrc(row.code, gender);
                return (
                  <button
                    key={row.code}
                    type="button"
                    disabled={busy}
                    onClick={() => void switchTo(row.code, gradeLevel)}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-extrabold ${child.professionCode === row.code ? "bg-orange-50 ring-2 ring-primary-orange" : "bg-slate-50"}`}
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="h-12 w-12 object-contain" draggable={false} />
                    ) : null}
                    {row.name_ar}
                  </button>
                );
              })}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-xs font-bold text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}