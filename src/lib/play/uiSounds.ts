/** Tiny pleasant UI sounds for elementary play (no asset files). */
export function playUiTone(kind: "click" | "pop" | "success" | "soft") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const freqs = { click: 880, pop: 520, success: 740, soft: 420 } as const;
    osc.type = kind === "success" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freqs[kind], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.22 : 0.1));
    osc.start(now);
    osc.stop(now + 0.25);
    window.setTimeout(() => void ctx.close(), 350);
  } catch {
    // ignore audio failures
  }
}
