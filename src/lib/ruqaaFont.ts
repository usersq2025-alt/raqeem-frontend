import localFont from "next/font/local";

export const ruqaaFont = localFont({
  src: [
    { path: "../../public/fonts/aref-ruqaa/ArefRuqaa-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/aref-ruqaa/ArefRuqaa-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-ruqaa",
  display: "swap",
});

export const naskhFont = localFont({
  src: [{ path: "../../public/fonts/noto-naskh-arabic/NotoNaskhArabic.ttf", weight: "400 700", style: "normal" }],
  variable: "--font-naskh",
  display: "swap",
});
