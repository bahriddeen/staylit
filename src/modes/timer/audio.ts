/**
 * Synthesized alarm tones for the timer/alarm, generated with the Web Audio API
 * so no audio asset needs to ship. AudioContext creation is deferred to first
 * use, which must happen from a user gesture (the Play button click) to satisfy
 * browser autoplay policies.
 *
 * Each tone is a pure data pattern (a sequence of "blips"); playAlarm schedules
 * them and scales loudness by the volume argument. The patterns are exported so
 * they can be unit-tested without a real AudioContext.
 */

export type AlarmTone = "beep" | "chime" | "bell" | "digital" | "pulse";

export const ALARM_TONES: readonly AlarmTone[] = [
  "beep",
  "chime",
  "bell",
  "digital",
  "pulse",
];

/** One scheduled note within a tone pattern. */
export interface Blip {
  /** Frequency in Hz. */
  freq: number;
  /** Start offset from the tone's beginning, in seconds. */
  at: number;
  /** Duration in seconds. */
  dur: number;
  /** Oscillator waveform. */
  type: OscillatorType;
  /** Relative loudness (0–1) before the master volume is applied. */
  gain: number;
}

/** Data-driven tone patterns. Peak gain per blip stays ≤ 0.32 so the summed
 *  output can't clip once the user's volume multiplier is applied. */
export const ALARM_PATTERNS: Record<AlarmTone, Blip[]> = {
  // A single clean sine beep (the original tone).
  beep: [{ freq: 880, at: 0, dur: 0.28, type: "sine", gain: 0.3 }],
  // A rising three-note arpeggio.
  chime: [
    { freq: 659.25, at: 0, dur: 0.18, type: "sine", gain: 0.28 },
    { freq: 783.99, at: 0.2, dur: 0.18, type: "sine", gain: 0.28 },
    { freq: 1046.5, at: 0.4, dur: 0.32, type: "sine", gain: 0.28 },
  ],
  // A struck bell: fundamental plus inharmonic overtones, long decay.
  bell: [
    { freq: 523.25, at: 0, dur: 0.9, type: "sine", gain: 0.3 },
    { freq: 1046.5, at: 0, dur: 0.7, type: "sine", gain: 0.16 },
    { freq: 1567.98, at: 0, dur: 0.5, type: "sine", gain: 0.08 },
  ],
  // Retro square-wave double pulse.
  digital: [
    { freq: 988, at: 0, dur: 0.12, type: "square", gain: 0.18 },
    { freq: 988, at: 0.18, dur: 0.12, type: "square", gain: 0.18 },
    { freq: 1319, at: 0.36, dur: 0.16, type: "square", gain: 0.18 },
  ],
  // Rapid repeated blips, like a phone alarm.
  pulse: [
    { freq: 784, at: 0, dur: 0.1, type: "triangle", gain: 0.3 },
    { freq: 784, at: 0.16, dur: 0.1, type: "triangle", gain: 0.3 },
    { freq: 784, at: 0.32, dur: 0.1, type: "triangle", gain: 0.3 },
    { freq: 784, at: 0.48, dur: 0.1, type: "triangle", gain: 0.3 },
  ],
};

/** Total audible length of a tone, in seconds (max blip end). */
export function toneDuration(tone: AlarmTone): number {
  return ALARM_PATTERNS[tone].reduce(
    (max, b) => Math.max(max, b.at + b.dur),
    0,
  );
}

export function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return 1;
  return Math.min(1, Math.max(0, volume));
}

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

/**
 * Play the given alarm tone at the given volume (0–1). Silently no-ops if Web
 * Audio is unavailable. Volume 0 plays nothing.
 */
export function playAlarm(tone: AlarmTone, volume = 1): void {
  const level = clampVolume(volume);
  if (level === 0) return;
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  for (const blip of ALARM_PATTERNS[tone]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = blip.type;
    osc.frequency.value = blip.freq;
    const start = now + blip.at;
    const peak = blip.gain * level;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + blip.dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + blip.dur + 0.02);
  }
}
