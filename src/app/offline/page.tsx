export const dynamic = "force-static";

// Served straight from the service worker's precache when a navigation has no network
// and no cached page to fall back to - this file itself never calls the server (see the
// `fallbacks` entry in src/app/sw.ts), so it stays plain static markup with no next-intl.
export default function OfflinePage() {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FAF6EC",
          color: "#1A2B47",
        }}
      >
        <span style={{ fontSize: "3rem" }} role="img" aria-label="">
          📡
        </span>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>لا يوجد اتصال بالإنترنت الآن</h1>
        <p style={{ fontSize: "0.95rem", margin: 0, maxWidth: "22rem" }}>
          بعض محتوى رقيم يعمل بدون إنترنت. جرّب فتح درس أو وحدة حمّلتها من قبل، أو أعد الاتصال وحاول مجددًا.
        </p>
        <p style={{ fontSize: "0.8rem", margin: 0, opacity: 0.7 }} dir="ltr">
          No internet connection. Try a previously downloaded lesson, or reconnect and retry.
        </p>
      </body>
    </html>
  );
}
