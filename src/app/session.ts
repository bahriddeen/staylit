/**
 * App-wide keep-awake session.
 *
 * A single WakeLock instance shared by every mode, plus the optional timed
 * countdown that Awake mode starts. Because it lives above the modes, a timed
 * session (and the wake lock itself) survives switching between Awake and the
 * clocks: turn it on in one mode and it stays on in the others, and the badge on
 * the switcher keeps counting down in the background.
 *
 * When a timer reaches zero it releases the lock and shows a toast, regardless
 * of which mode is currently mounted.
 */

import { WakeLock, type WakeLockState } from "../core/wakeLock";
import { Ticker } from "../core/ticker";
import { t } from "../core/i18n";
import { icons } from "../ui/icons";
import { showToast } from "../ui/toast";

export interface SessionState {
  wake: WakeLockState;
  /** Absolute end time of the current timed run, or null for always-on/off. */
  endTimestamp: number | null;
  /** Milliseconds left in the current timed run (0 when not timed). */
  remainingMs: number;
  /** Whether a finite countdown is active. */
  timed: boolean;
}

export type SessionListener = (state: Readonly<SessionState>) => void;

export class AppSession {
  readonly wakeLock: WakeLock;
  private readonly ticker = new Ticker();
  private endTimestamp: number | null = null;
  private readonly listeners = new Set<SessionListener>();

  constructor() {
    this.wakeLock = new WakeLock();
    this.wakeLock.onChange(() => this.emit());
  }

  get isSupported(): boolean {
    return this.wakeLock.isSupported;
  }

  getState(): Readonly<SessionState> {
    const remainingMs =
      this.endTimestamp !== null
        ? Math.max(0, this.endTimestamp - Date.now())
        : 0;
    return {
      wake: this.wakeLock.getState(),
      endTimestamp: this.endTimestamp,
      remainingMs,
      timed: this.endTimestamp !== null,
    };
  }

  onChange(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** Turn keep-awake on. `ms = null` keeps it on indefinitely (no timer). */
  start(ms: number | null): void {
    void this.wakeLock.request();
    if (ms !== null) {
      this.endTimestamp = Date.now() + ms;
      this.ticker.start(() => this.onTick());
    } else {
      this.endTimestamp = null;
      this.ticker.stop();
    }
    this.emit();
  }

  /** Turn keep-awake off and cancel any timer. */
  stop(): void {
    void this.wakeLock.release();
    this.endTimestamp = null;
    this.ticker.stop();
    this.emit();
  }

  /** Sun toggle: off→always-on, on→off. */
  toggle(): void {
    if (this.wakeLock.getState().wanted) this.stop();
    else this.start(null);
  }

  /** Ensure the lock is on (e.g. entering fullscreen) without touching a timer. */
  ensureWake(): void {
    if (!this.wakeLock.getState().wanted) this.start(null);
  }

  dispose(): void {
    this.ticker.stop();
    this.wakeLock.dispose();
    this.listeners.clear();
  }

  private onTick(): void {
    if (this.endTimestamp !== null && Date.now() >= this.endTimestamp) {
      this.finish();
      return;
    }
    this.emit();
  }

  private finish(): void {
    this.stop();
    showToast(t("awake.toast.finished"), { icon: icons.clock });
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}
