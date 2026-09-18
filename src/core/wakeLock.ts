/**
 * Screen Wake Lock manager, shared by all modes.
 *
 * Behavior:
 *  - request(): navigator.wakeLock.request('screen'), keeps the sentinel and
 *    listens for its 'release' event.
 *  - release(): releases the sentinel.
 *  - On visibilitychange, if the page becomes visible again and the user still
 *    wants the lock, it is re-requested automatically (the OS drops wake locks
 *    when a tab is hidden).
 *  - Falls back to a looping muted inline <video> when the API is unsupported
 *    (older iOS Safari). The fallback can only start from a user gesture.
 *  - Never throws to the UI. All failures are reported via onChange(reason).
 */

import { SILENT_MP4_DATA_URI, SILENT_WEBM_DATA_URI } from "./silentVideo";

export type WakeLockMethod = "none" | "native" | "video";

export interface WakeLockState {
  /** Whether the user has asked for the lock to be on. */
  wanted: boolean;
  /** Whether a lock is currently held (native sentinel or playing video). */
  active: boolean;
  /** Whether the native Screen Wake Lock API is available. */
  supported: boolean;
  /** Which mechanism is currently providing the lock. */
  method: WakeLockMethod;
  /** Human-readable reason for the last error, if any. */
  reason: string | null;
}

export type WakeLockListener = (state: Readonly<WakeLockState>) => void;

// Minimal typings for the Wake Lock API (avoids relying on lib.dom versions).
interface WakeLockSentinelLike extends EventTarget {
  released: boolean;
  release(): Promise<void>;
}
interface WakeLockApi {
  request(type: "screen"): Promise<WakeLockSentinelLike>;
}

function getWakeLockApi(): WakeLockApi | null {
  const nav = navigator as Navigator & { wakeLock?: WakeLockApi };
  return nav.wakeLock ?? null;
}

export class WakeLock {
  readonly isSupported: boolean;

  private wanted = false;
  private sentinel: WakeLockSentinelLike | null = null;
  private video: HTMLVideoElement | null = null;
  private method: WakeLockMethod = "none";
  private reason: string | null = null;
  private listeners = new Set<WakeLockListener>();

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState !== "visible") return;
    // The OS releases the sentinel when hidden; re-acquire if still wanted.
    if (this.wanted && !this.isActive) {
      void this.acquire();
    }
  };

  private readonly onSentinelRelease = (): void => {
    this.sentinel = null;
    // If the user still wants it but we didn't ask for the release, reflect the
    // drop; visibilitychange will re-request when the tab is next visible.
    if (this.method === "native") this.method = "none";
    this.emit();
  };

  constructor() {
    this.isSupported = getWakeLockApi() !== null;
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  get isActive(): boolean {
    if (this.method === "native") return this.sentinel !== null;
    if (this.method === "video") return this.video !== null;
    return false;
  }

  getState(): Readonly<WakeLockState> {
    return {
      wanted: this.wanted,
      active: this.isActive,
      supported: this.isSupported,
      method: this.method,
      reason: this.reason,
    };
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  onChange(listener: WakeLockListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately so subscribers can render without waiting.
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Request the wake lock. Must be called from a user gesture for the video
   * fallback to be allowed to play. Never rejects.
   */
  async request(): Promise<void> {
    this.wanted = true;
    this.reason = null;
    await this.acquire();
  }

  /** Release the wake lock and stop wanting it. Never rejects. */
  async release(): Promise<void> {
    this.wanted = false;
    await this.releaseNative();
    this.stopVideo();
    this.method = "none";
    this.emit();
  }

  /** Remove listeners and release everything. Call on teardown. */
  dispose(): void {
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    void this.releaseNative();
    this.stopVideo();
    this.listeners.clear();
  }

  private async acquire(): Promise<void> {
    const api = getWakeLockApi();
    if (api) {
      try {
        const sentinel = await api.request("screen");
        this.sentinel = sentinel;
        this.method = "native";
        this.reason = null;
        sentinel.addEventListener("release", this.onSentinelRelease, {
          once: true,
        });
        this.emit();
        return;
      } catch (err) {
        // Common when the tab isn't visible/focused, or on low battery.
        this.reason = describeError(err);
        // Fall through to the video fallback so the user still gets a lock.
      }
    }

    const ok = this.startVideo();
    if (ok) {
      this.method = "video";
      this.emit();
    } else {
      this.method = "none";
      if (!this.reason) {
        this.reason = this.isSupported
          ? "Could not acquire a wake lock."
          : "Wake Lock is not supported and the video fallback failed.";
      }
      this.emit();
    }
  }

  private async releaseNative(): Promise<void> {
    const sentinel = this.sentinel;
    if (!sentinel) return;
    this.sentinel = null;
    sentinel.removeEventListener("release", this.onSentinelRelease);
    try {
      await sentinel.release();
    } catch {
      // Releasing an already-released sentinel is fine; ignore.
    }
  }

  private startVideo(): boolean {
    try {
      if (!this.video) {
        const video = document.createElement("video");
        video.setAttribute("muted", "");
        video.muted = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("aria-hidden", "true");
        video.loop = true;
        // Keep it in the layout but invisible and non-interactive.
        video.style.cssText =
          "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;bottom:0;";

        const mp4 = document.createElement("source");
        mp4.src = SILENT_MP4_DATA_URI;
        mp4.type = "video/mp4";
        const webm = document.createElement("source");
        webm.src = SILENT_WEBM_DATA_URI;
        webm.type = "video/webm";
        video.append(mp4, webm);

        document.body.appendChild(video);
        this.video = video;
      }
      // play() returns a promise; a rejection (e.g. no user gesture) is reported
      // but must not throw to the caller.
      void this.video.play().catch((err) => {
        this.reason = describeError(err);
        this.stopVideo();
        this.method = "none";
        this.emit();
      });
      return true;
    } catch (err) {
      this.reason = describeError(err);
      return false;
    }
  }

  private stopVideo(): void {
    if (!this.video) return;
    try {
      this.video.pause();
      this.video.remove();
    } catch {
      // ignore
    }
    this.video = null;
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.name === "NotAllowedError"
      ? "Wake lock was blocked (needs a user gesture or a visible tab)."
      : err.message || err.name;
  }
  return "Unknown wake lock error.";
}
