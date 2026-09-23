import { readExperiencePrefs } from "@/lib/experience/experiencePrefs";

export type UiToneKind = "click" | "pop" | "success" | "soft" | "wrong" | "bigSuccess";

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedCtx = new Ctx();
    }
    if (sharedCtx.state === "suspended") void sharedCtx.resume().catch(() => undefined);
    return sharedCtx;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, freq: number, startAt: number, duration: number, opts: { type?: OscillatorType; peak?: number } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(opts.peak ?? 0.08, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Tiny, pleasant, non-punishing UI sounds for elementary play (no asset
 * files — synthesized so they stay tiny and instant to trigger).
 *
 * - click / pop / soft: quiet interaction ticks, gated by the `sfx` pref.
 * - success: a short, cheerful blip for a correct answer.
 * - wrong: a gentle, neutral two-note dip — never harsh or alarm-like,
 *   because a mistake is feedback, not a punishment.
 * - bigSuccess: a brighter little three-note fanfare for finishing a whole
 *   lesson, clearly bigger than a single correct answer but still under a
 *   second so it never blocks moving on.
 * Every tone respects the sound setting. Celebration tones also respect the
 * celebration setting, so switching either off never surprises the learner.
 */
export function playUiTone(kind: UiToneKind) {
  if (typeof window === "undefined") return;
  const prefs = readExperiencePrefs();
  if (!prefs.sfx) return;
  if ((kind === "success" || kind === "bigSuccess") && !prefs.celebration) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    if (kind === "wrong") {
      // Soft, neutral downward dip — informative, not alarming.
      tone(ctx, 392, now, 0.16, { type: "sine", peak: 0.055 });
      tone(ctx, 330, now + 0.1, 0.18, { type: "sine", peak: 0.05 });
      return;
    }
    if (kind === "bigSuccess") {
      // Bright three-note little fanfare, distinct from the single-question "success".
      tone(ctx, 523.25, now, 0.16, { type: "triangle", peak: 0.075 });
      tone(ctx, 659.25, now + 0.11, 0.16, { type: "triangle", peak: 0.08 });
      tone(ctx, 783.99, now + 0.22, 0.3, { type: "triangle", peak: 0.09 });
      return;
    }
    const freqs = { click: 880, pop: 520, success: 740, soft: 420 } as const;
    tone(ctx, freqs[kind], now, kind === "success" ? 0.22 : 0.1, {
      type: kind === "success" ? "triangle" : "sine",
      peak: 0.08,
    });
  } catch {
    // ignore audio failures
  }
}
