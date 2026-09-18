/**
 * Vitest setup. jsdom does not implement HTMLMediaElement.play/pause and logs
 * noisy "Not implemented" errors when the Wake Lock video fallback runs. Stub
 * them so tests exercise the fallback path cleanly. play() rejects to emulate a
 * browser that blocks autoplay without a user gesture.
 */

HTMLMediaElement.prototype.play = function play(): Promise<void> {
  return Promise.reject(
    new DOMException("play() not allowed in test env", "NotAllowedError"),
  );
};

HTMLMediaElement.prototype.pause = function pause(): void {
  // no-op
};
