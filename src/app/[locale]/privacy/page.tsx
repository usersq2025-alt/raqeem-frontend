import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BrandPageDecor } from "@/components/BrandPageDecor";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RAQEEM_CONTACT_EMAIL } from "@/config/landing";

type Section = { title: string; paragraphs?: string[]; items?: string[] };

type PolicyCopy = {
  metaTitle: string;
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
  contactTitle: string;
  contactBody: string;
  backHome: string;
};

const COPY: Record<"ar" | "en", PolicyCopy> = {
  ar: {
    metaTitle: "سياسة الخصوصية | رقيم",
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 19 تشرين الأول 2026",
    intro:
      "رقيم منصة تعليمية تفاعلية موجّهة لأطفال المرحلة الابتدائية في الجمهورية العربية السورية، ويستخدمها الطفل تحت إشراف وليّ أمره. نحترم خصوصيتكم ونلتزم بحماية بيانات أطفالكم. توضّح هذه السياسة ما نجمعه من بيانات، ولماذا، وكيف نحميه، وما هي حقوقكم.",
    sections: [
      {
        title: "1. من نحن ونطاق السياسة",
        paragraphs: [
          "تسري هذه السياسة على موقع رقيم وتطبيقاته وخدماته المرتبطة به (ويُشار إليها بـ «المنصة»)، وعلى كل من وليّ الأمر والطفل المستخدم.",
          "حساب الوليّ هو الحساب الرئيسي؛ وهو من ينشئ حسابات الأطفال ويدير إعداداتها، ويتحمّل مسؤولية الموافقة على هذه السياسة نيابةً عنهم.",
        ],
      },
      {
        title: "2. البيانات التي نجمعها",
        paragraphs: ["نجمع أقلّ قدر من البيانات اللازمة لتشغيل الخدمة:"],
        items: [
          "بيانات وليّ الأمر: الاسم، البريد الإلكتروني و/أو رقم الهاتف، وبيانات التحقق (رمز التحقق لمرة واحدة)، وكلمة المرور مخزّنة بشكل مشفّر غير قابل للقراءة.",
          "بيانات الطفل: الاسم أو اللقب المستعار، العمر أو الصف الدراسي، الصورة الرمزية (الأفاتار)، ومعرّف الحساب. لا نطلب صورًا شخصية حقيقية ولا عنوان السكن ولا الموقع الجغرافي الدقيق.",
          "بيانات التعلّم: الدروس والتمارين المُنجزة، الإجابات، النتائج، التقدّم، النقاط، العناصر المكتسبة في المنصة، وسلسلة الأيام المتتالية.",
          "بيانات تقنية: نوع المتصفح والجهاز، اللغة، سجلات الأخطاء والأمان، وعنوان الشبكة (IP) لأغراض الحماية من إساءة الاستخدام.",
          "رسائل التواصل: ما ترسلونه إلينا عبر نموذج أو بريد التواصل.",
        ],
      },
      {
        title: "3. كيف نستخدم البيانات",
        items: [
          "تشغيل الحسابات وتسجيل الدخول والتحقق من الهوية.",
          "تقديم المحتوى التعليمي وتخصيصه بحسب مستوى الطفل وتقدّمه.",
          "إعداد تقارير التقدّم لوليّ الأمر.",
          "إرسال رموز التحقق والإشعارات الضرورية للخدمة.",
          "حماية المنصة ومنع الاحتيال وإساءة الاستخدام وتحسين الأداء والجودة.",
          "الرد على استفساراتكم وطلباتكم.",
        ],
        paragraphs: [
          "لا نبيع بيانات المستخدمين، ولا نستخدم بيانات الأطفال لأغراض الإعلانات الموجّهة أو بناء ملفات تسويقية عنهم.",
        ],
      },
      {
        title: "4. خصوصية الأطفال",
        items: [
          "لا يُنشأ حساب طفل إلا عن طريق وليّ أمره وبموافقته.",
          "للوليّ الاطلاع على بيانات طفله وتقدّمه، وتعديلها، أو طلب حذفها في أي وقت.",
          "لا تتضمن المنصة محادثات مفتوحة مع غرباء، ولا نشرًا علنيًا لبيانات الأطفال.",
          "نحدّ من البيانات المعروضة للطفل داخل المنصة بما يناسب عمره.",
        ],
      },
      {
        title: "5. الذكاء الاصطناعي",
        paragraphs: [
          "قد تستخدم بعض ميزات المنصة تقنيات ذكاء اصطناعي لتوليد شروحات أو أسئلة أو ملاحظات تعليمية. نسعى إلى ألّا تتضمن المُدخلات المرسلة إلى هذه الخدمات أي بيانات تعريفية (كالاسم الحقيقي أو بيانات الاتصال)، ونراجع هذه الميزات باستمرار لضمان ملاءمتها للأطفال. قد تحتوي مخرجات الذكاء الاصطناعي على أخطاء، ويُنصح الوليّ بمتابعة طفله.",
        ],
      },
      {
        title: "6. مشاركة البيانات",
        paragraphs: [
          "لا نشارك بياناتكم إلا في الحدود اللازمة لتشغيل الخدمة، وذلك مع:",
        ],
        items: [
          "مزوّدي الخدمات التقنية: الاستضافة، إرسال البريد الإلكتروني ورسائل التحقق (بريد، واتساب، رسائل نصية)، وخدمات الذكاء الاصطناعي؛ وهم ملزمون بالتعامل مع البيانات لغرض تقديم الخدمة فقط.",
          "الجهات الرسمية المختصة، إذا طُلب ذلك بموجب القانون النافذ في الجمهورية العربية السورية أو لحماية حقوقنا وسلامة المستخدمين.",
        ],
      },
      {
        title: "7. الاحتفاظ بالبيانات",
        paragraphs: [
          "نحتفظ بالبيانات ما دام الحساب نشطًا ولمدة معقولة بعد ذلك للأغراض القانونية والأمنية. عند طلب حذف الحساب، نحذف البيانات الشخصية أو نجعلها مجهولة الهوية خلال مدة معقولة، باستثناء ما يلزم الاحتفاظ به قانونًا.",
        ],
      },
      {
        title: "8. أمن المعلومات",
        paragraphs: [
          "نعتمد إجراءات تقنية وتنظيمية مناسبة، منها التشفير أثناء النقل (HTTPS)، وتخزين كلمات المرور بشكل مشفّر، وتقييد صلاحيات الوصول. ومع ذلك لا توجد وسيلة نقل أو تخزين آمنة بالكامل، لذا نوصي بالحفاظ على سرية بيانات الدخول وعدم مشاركتها.",
        ],
      },
      {
        title: "9. نقل البيانات خارج سوريا",
        paragraphs: [
          "قد تُستضاف بعض البيانات أو تُعالَج لدى مزوّدي خدمات خارج الجمهورية العربية السورية. نختار مزوّدين يطبّقون ضمانات أمنية مناسبة، ونقتصر على نقل ما يلزم لتقديم الخدمة.",
        ],
      },
      {
        title: "10. حقوقكم",
        items: [
          "الاطلاع على البيانات الشخصية المحفوظة لدينا.",
          "تصحيح البيانات غير الدقيقة أو استكمالها.",
          "طلب حذف الحساب وبياناته.",
          "سحب الموافقة على المعالجة، مع العلم أن ذلك قد يمنع استخدام بعض الخدمات.",
        ],
        paragraphs: ["لممارسة أي من هذه الحقوق، تواصلوا معنا عبر البريد الموضّح أدناه."],
      },
      {
        title: "11. ملفات تعريف الارتباط",
        paragraphs: [
          "نستخدم ملفات تعريف ارتباط ضرورية لتسجيل الدخول والحفاظ على الجلسة وحفظ تفضيل اللغة. لا نستخدم ملفات تعريف ارتباط إعلانية أو تتبّعًا لأغراض تسويقية.",
        ],
      },
      {
        title: "12. التعديلات على السياسة",
        paragraphs: [
          "قد نُحدّث هذه السياسة من وقت لآخر. سنعرض النسخة المحدّثة على هذه الصفحة مع تاريخ آخر تحديث، وفي حال التغييرات الجوهرية سنُنبّه الأولياء عبر المنصة أو البريد. استمرار استخدام المنصة بعد التحديث يعني قبول النسخة الجديدة.",
        ],
      },
    ],
    contactTitle: "تواصلوا معنا",
    contactBody: "لأي سؤال أو طلب يخصّ الخصوصية أو بيانات طفلكم، راسلونا على:",
    backHome: "العودة إلى الرئيسية",
  },
  en: {
    metaTitle: "Privacy Policy | Raqeem",
    title: "Privacy Policy",
    updated: "Last updated: 19 October 2026",
    intro:
      "Raqeem is an interactive learning platform for primary-school children in the Syrian Arab Republic, used by children under the supervision of a parent or guardian. We respect your privacy and are committed to protecting your children's data. This policy explains what we collect, why, how we protect it, and what rights you have.",
    sections: [
      {
        title: "1. Who we are and scope",
        paragraphs: [
          "This policy applies to the Raqeem website, apps and related services (the “Platform”), and to both parents/guardians and child users.",
          "The parent account is the primary account. The parent creates and manages child accounts and accepts this policy on their behalf.",
        ],
      },
      {
        title: "2. Data we collect",
        paragraphs: ["We collect only what is needed to run the service:"],
        items: [
          "Parent data: name, email and/or phone number, one-time verification codes, and a password stored in hashed form.",
          "Child data: name or nickname, age or grade, avatar, and account ID. We do not ask for real photos, home address or precise location.",
          "Learning data: completed lessons and exercises, answers, results, progress, points, in-platform items and daily streaks.",
          "Technical data: browser and device type, language, error and security logs, and IP address for abuse prevention.",
          "Messages: whatever you send us through the contact form or email.",
        ],
      },
      {
        title: "3. How we use data",
        items: [
          "Operating accounts, sign-in and identity verification.",
          "Delivering and personalising learning content to the child's level.",
          "Producing progress reports for parents.",
          "Sending verification codes and essential service notices.",
          "Securing the Platform, preventing fraud and abuse, and improving quality.",
          "Responding to your questions and requests.",
        ],
        paragraphs: [
          "We do not sell user data, and we do not use children's data for targeted advertising or marketing profiles.",
        ],
      },
      {
        title: "4. Children's privacy",
        items: [
          "A child account can only be created by a parent or guardian, with their consent.",
          "Parents may view, correct or request deletion of their child's data at any time.",
          "The Platform has no open chat with strangers and does not publish children's data publicly.",
          "We limit the data shown to children inside the Platform to what suits their age.",
        ],
      },
      {
        title: "5. Artificial intelligence",
        paragraphs: [
          "Some features may use AI to generate explanations, questions or learning feedback. We aim to keep identifying data (such as real names or contact details) out of what is sent to these services, and we review these features to keep them child-appropriate. AI output may contain mistakes, so parents are encouraged to follow their child's learning.",
        ],
      },
      {
        title: "6. Sharing data",
        paragraphs: ["We share data only as needed to run the service, with:"],
        items: [
          "Technical service providers: hosting, email and verification message delivery (email, WhatsApp, SMS) and AI services, who may process data only to provide the service.",
          "Competent authorities, when required by law in force in the Syrian Arab Republic or to protect our rights and users' safety.",
        ],
      },
      {
        title: "7. Retention",
        paragraphs: [
          "We keep data while the account is active and for a reasonable period afterwards for legal and security purposes. When you request account deletion, we delete or anonymise personal data within a reasonable time, except where retention is legally required.",
        ],
      },
      {
        title: "8. Security",
        paragraphs: [
          "We apply appropriate technical and organisational measures, including encryption in transit (HTTPS), hashed password storage and restricted access. No method of transmission or storage is completely secure, so please keep your sign-in details confidential.",
        ],
      },
      {
        title: "9. Transfers outside Syria",
        paragraphs: [
          "Some data may be hosted or processed by providers outside the Syrian Arab Republic. We choose providers with suitable security safeguards and transfer only what is needed to deliver the service.",
        ],
      },
      {
        title: "10. Your rights",
        items: [
          "Access the personal data we hold.",
          "Correct or complete inaccurate data.",
          "Request deletion of the account and its data.",
          "Withdraw consent to processing, understanding that some services may then be unavailable.",
        ],
        paragraphs: ["To exercise these rights, contact us at the email below."],
      },
      {
        title: "11. Cookies",
        paragraphs: [
          "We use essential cookies for sign-in, session handling and language preference. We do not use advertising cookies or marketing tracking.",
        ],
      },
      {
        title: "12. Changes to this policy",
        paragraphs: [
          "We may update this policy from time to time. The latest version will be posted here with its update date, and for material changes we will notify parents through the Platform or email. Continued use after an update means acceptance of the new version.",
        ],
      },
    ],
    contactTitle: "Contact us",
    contactBody: "For any privacy question or request about your child's data, email us at:",
    backHome: "Back to home",
  },
};

async function getCopy(): Promise<PolicyCopy> {
  const locale = await getLocale();
  return locale === "ar" ? COPY.ar : COPY.en;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.metaTitle };
}

export default async function PrivacyPage() {
  const copy = await getCopy();

  return (
    <main className="landing-page relative min-h-screen overflow-x-hidden bg-brand-cream font-body text-brand-navy-dark">
      <BrandPageDecor density="compact" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[820px] flex-col px-5 py-6 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <LanguageSwitcher />
        </header>

        <article className="rounded-[28px] bg-white/85 p-7 shadow-[0_18px_40px_-28px_rgba(0,56,144,0.35)] ring-1 ring-brand-navy/10 sm:p-10">
          <h1 className="text-[1.85rem] font-black text-brand-navy-dark sm:text-[2.2rem]">{copy.title}</h1>
          <p className="mt-2 text-sm font-bold text-brand-navy/55">{copy.updated}</p>
          <p className="mt-5 text-base font-medium leading-loose text-brand-navy/80 sm:text-lg">{copy.intro}</p>

          {copy.sections.map((section) => (
            <section key={section.title} className="mt-8">
              <h2 className="text-xl font-extrabold text-brand-navy sm:text-2xl">{section.title}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="mt-3 text-base leading-loose text-brand-navy/80">
                  {p}
                </p>
              ))}
              {section.items ? (
                <ul className="mt-3 list-disc space-y-2 ps-6 text-base leading-loose text-brand-navy/80 marker:text-brand-gold">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <div className="mt-10 rounded-[22px] bg-brand-cream px-5 py-5">
            <h2 className="text-lg font-extrabold text-brand-navy">{copy.contactTitle}</h2>
            <p className="mt-2 text-base text-brand-navy/80">{copy.contactBody}</p>
            <a
              href={`mailto:${RAQEEM_CONTACT_EMAIL}`}
              className="mt-2 inline-flex break-all text-lg font-extrabold text-brand-navy underline decoration-brand-gold decoration-2 underline-offset-4 hover:text-brand-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              {RAQEEM_CONTACT_EMAIL}
            </a>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex min-h-11 items-center text-base font-bold text-brand-navy underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {copy.backHome}
          </Link>
        </article>
      </div>
    </main>
  );
}
