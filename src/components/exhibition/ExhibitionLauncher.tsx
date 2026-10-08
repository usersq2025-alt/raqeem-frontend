"use client";

import { useEffect, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { professionAvatarSrc } from "@/lib/config/professions";
import {
  GRADE_NAMES,
  loadExhibitionSession,
  startExhibitionSession,
  type ExhibitionProfession,
  type ExhibitionSession,
} from "@/lib/api/exhibitionSession";

type Gender = "male" | "female";

const card = "rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7";
const pill =
  "min-h-11 rounded-2xl px-5 py-3 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange disabled:opacity-40";

/** Exhibition entry: pick profession, grade and boy/girl, then land in the real student experience. */
export function ExhibitionLauncher() {
  const router = useRouter();
  const [professions, setProfessions] = useState<ExhibitionProfession[]>([]);
  const [current, setCurrent] = useState<ExhibitionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [profession, setProfession] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>("male");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadExhibitionSession()
      .then((state) => {
        if (!active) return;
        setProfessions(state.professions);
        setCurrent(state.session);
        setError("");
      })
      .catch((caught: { status?: number }) => {
        if (!active) return;
        setError(
          caught?.status === 403
            ? "هذه الصفحة مخصصة لحساب رقيم التجريبي للمعرض."
            : "تعذّر تحميل خيارات المعرض. حاول مجددًا."
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  async function start(fresh: boolean) {
    if (!profession || !grade || busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await startExhibitionSession({ professionCode: profession, gradeLevel: grade, gender, fresh });
      router.push(`/subjects?childId=${session.student_id}`);
    } catch {
      setError("تعذّر بدء التجربة. حاول مجددًا.");
      setBusy(false);
    }
  }

  const ready = Boolean(profession && grade);
  const chosen = professions.find((row) => row.code === profession);

  return (
    <main dir="rtl" className="min-h-screen bg-[#F3F6FA] px-4 py-5 text-text-navy sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <div className="flex flex-wrap gap-2">
            <Link href="/family/exhibition" className={`${pill} bg-white`}>
              معاينة الألعاب السريعة
            </Link>
            <Link href="/family/settings" className={`${pill} bg-white`}>
              حساب ولي الأمر
            </Link>
          </div>
        </header>

        <section className={`${card} mb-5`}>
          <p className="mb-1 text-sm font-extrabold text-primary-orange">أهلًا بزوار رقيم</p>
          <h1 className="text-3xl font-black">جرّب رقيم كطالب</h1>
          <p className="mt-2 text-sm leading-7 text-text-gray">
            اختر المهنة ثم الصف، وسيدخل الزائر تجربة الطالب كاملة: المواد والألعاب والنجوم والمتجر ومقر المهنة.
            يمكنك تبديل المهنة أو الصف أو بدء زائر جديد في أي لحظة من شريط «وضع المعرض» داخل التجربة.
          </p>
          {current ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-orange-50 p-3">
              <p className="text-sm font-extrabold">
                يوجد زائر حالي: الصف {GRADE_NAMES[(current.grade_level ?? 1) - 1]} ·{" "}
                {professions.find((row) => row.code === current.profession_code)?.name_ar ?? ""}
              </p>
              <Link
                href={`/subjects?childId=${current.student_id}`}
                className={`${pill} bg-primary-orange text-white`}
              >
                متابعة الزائر الحالي
              </Link>
            </div>
          ) : null}
        </section>

        {loading ? (
          <p role="status" className={card}>
            جارٍ التحميل…
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="mb-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">
            {error}
            {!professions.length ? (
              <button
                className={`${pill} ms-3 bg-white`}
                onClick={() => {
                  setLoading(true);
                  setAttempt((n) => n + 1);
                }}
              >
                إعادة المحاولة
              </button>
            ) : null}
          </div>
        ) : null}

        {professions.length > 0 ? (
          <>
            <section className={`${card} mb-5`} aria-labelledby="ex-step-1">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="ex-step-1" className="text-xl font-extrabold">
                  <span className="me-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-orange text-sm text-white">
                    1
                  </span>
                  ما المهنة التي يريدها؟
                </h2>
                <div role="group" aria-label="الشخصية" className="flex gap-2">
                  {(["male", "female"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={gender === value}
                      onClick={() => setGender(value)}
                      className={`${pill} ${gender === value ? "bg-text-navy text-white" : "bg-slate-100"}`}
                    >
                      {value === "male" ? "ولد" : "بنت"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {professions.map((row) => {
                  const src = professionAvatarSrc(row.code, gender);
                  const selected = profession === row.code;
                  return (
                    <button
                      key={row.code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setProfession(row.code)}
                      className={`flex flex-col items-center gap-2 rounded-3xl border-[3px] p-3 text-center transition focus-visible:outline-2 focus-visible:outline-primary-orange ${
                        selected ? "border-primary-orange bg-orange-50" : "border-slate-100 bg-white hover:border-orange-200"
                      }`}
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-28 w-28 object-contain" draggable={false} />
                      ) : null}
                      <span className="text-lg font-extrabold">{row.name_ar}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`${card} mb-5`} aria-labelledby="ex-step-2">
              <h2 id="ex-step-2" className="mb-4 text-xl font-extrabold">
                <span className="me-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-orange text-sm text-white">
                  2
                </span>
                في أي صف هو؟
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {GRADE_NAMES.map((name, index) => {
                  const selected = grade === index + 1;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGrade(index + 1)}
                      className={`rounded-3xl border-[3px] p-4 text-center transition focus-visible:outline-2 focus-visible:outline-primary-orange ${
                        selected ? "border-primary-orange bg-orange-50" : "border-slate-100 bg-white hover:border-orange-200"
                      }`}
                    >
                      <span className="block text-4xl font-black text-primary-orange">{index + 1}</span>
                      <span className="mt-1 block text-lg font-extrabold">الصف {name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`${card} text-center`} aria-labelledby="ex-step-3">
              <h2 id="ex-step-3" className="mb-1 text-xl font-extrabold">
                <span className="me-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-orange text-sm text-white">
                  3
                </span>
                ابدأ التجربة
              </h2>
              <p className="mb-4 text-sm text-text-gray">
                {ready
                  ? `زائر ${gender === "male" ? "" : "ة"} ${chosen?.name_ar ?? ""} في الصف ${GRADE_NAMES[(grade ?? 1) - 1]} — بعدها يختار المادة بنفسه.`
                  : "اختر المهنة والصف أولًا."}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  disabled={!ready || busy}
                  onClick={() => void start(true)}
                  className={`${pill} bg-primary-orange text-white`}
                >
                  {busy ? "جارٍ التجهيز…" : "ابدأ زائرًا جديدًا"}
                </button>
                {current ? (
                  <button
                    type="button"
                    disabled={!ready || busy}
                    onClick={() => void start(false)}
                    className={`${pill} bg-slate-100`}
                  >
                    تغيير الزائر الحالي مع إبقاء تقدمه
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-text-gray">
                الزائر الجديد يبدأ من الصفر برصيد نقاط كافٍ لتجربة المتجر والمقر.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}