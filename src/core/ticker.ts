/**
 * A clock ticker that fires exactly on each real second boundary.
 *
 * Rather than a fixed setInterval(1000) (which drifts and can skip seconds when
 * the tab is throttled), each tick schedules the next one for the start of the
 * next wall-clock second: 1000 - (Date.now() % 1000). On visibilitychange we
 * re-sync so the display is correct the instant the tab is shown again.
 */

export type TickCallback = (now: Date) => void;

export class Ticker {
  private callback: TickCallback | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  private readonly onVisibility = (): void => {
    if (!this.running) return;
    // Coming back into view: fire immediately, then realign to the boundary.
    if (document.visibilityState === "visible") {
      this.fire();
      this.schedule();
    }
  };

  /** Start ticking. Fires once immediately, then on every second boundary. */
  start(callback: TickCallback): void {
    this.stop();
    this.callback = callback;
    this.running = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.fire();
    this.schedule();
  }

  /** Stop ticking and clean up listeners. */
  stop(): void {
    this.running = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.callback = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Milliseconds until the next second boundary. Exposed for testing the
   * scheduling math without relying on timers.
   */
  static msUntilNextSecond(now: number = Date.now()): number {
    const remainder = now % 1000;
    // If we're exactly on a boundary, wait a full second, not 0.
    return remainder === 0 ? 1000 : 1000 - remainder;
  }

  private fire(): void {
    this.callback?.(new Date());
  }

  private schedule(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    const delay = Ticker.msUntilNextSecond();
    this.timeoutId = setTimeout(() => {
      if (!this.running) return;
      this.fire();
      // Recompute from the wall clock every time so we never accumulate drift.
      this.schedule();
    }, delay);
  }
}
