/**
 * A short synthesized beep for timer alarms, generated with the Web Audio API
 * so no audio asset needs to ship. AudioContext creation is deferred to first
 * use, which must happen from a user gesture (the Play button click) to
 * satisfy browser autoplay policies.
 */

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Play a short (~300ms) beep. Silently no-ops if Web Audio is unavailable. */
export function playBeep(): void {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  const t0 = audio.currentTime;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + 0.3);
}
