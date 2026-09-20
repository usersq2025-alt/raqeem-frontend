import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Cairo, IBM_Plex_Sans_Arabic, Nunito, Tajawal } from "next/font/google";
import { routing } from "@/i18n/routing";
import { LATIN_NUMBER_FORMATS } from "@/lib/i18n/latinNumerals";
import "../globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-ar",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    applicationName: "رقيم",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico?v=2", sizes: "any" },
        { url: "/favicon-48x48.png?v=2", sizes: "48x48", type: "image/png" },
        { url: "/favicon-96x96.png?v=2", sizes: "96x96", type: "image/png" },
        { url: "/icon-192x192.png?v=2", sizes: "192x192", type: "image/png" },
        { url: "/icon-512x512.png?v=2", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
      shortcut: [{ url: "/favicon-48x48.png?v=2", type: "image/png" }],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = locale === "ar";

  return (
    <html
      lang={locale}
      dir={isRtl ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${cairo.variable} ${tajawal.variable} ${plexArabic.variable} ${nunito.variable} h-full antialiased${isRtl ? " numerals-latn" : ""}`}
    >
      <body className={`min-h-full bg-background-white ${isRtl ? "font-sans" : "font-sans-ltr"}`}>
        <NextIntlClientProvider locale={locale} messages={messages} formats={LATIN_NUMBER_FORMATS}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
