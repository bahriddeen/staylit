/**
 * Typed localStorage wrapper.
 *
 * Every access is guarded: private-mode, disabled storage, quota errors, and
 * malformed JSON all fall back to the provided default instead of throwing.
 * Values are JSON-serialized under a namespaced key.
 */

const NAMESPACE = "awake-clock";

export interface TypedStore<T> {
  /** Current value, or the default if unreadable. */
  get(): T;
  /** Persist a value. Returns true if it was written, false if storage failed. */
  set(value: T): boolean;
  /** Read-modify-write helper built on get/set. */
  update(fn: (current: T) => T): boolean;
  /** Remove the key. Returns true on success. */
  remove(): boolean;
}

function namespacedKey(key: string): string {
  return `${NAMESPACE}:${key}`;
}

/**
 * Feature-detect a working localStorage. Some browsers expose the object but
 * throw on write (Safari private mode historically did this).
 */
function getBackend(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = "__awake_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createStorage<T>(key: string, defaultValue: T): TypedStore<T> {
  const fullKey = namespacedKey(key);
  const backend = getBackend();

  return {
    get(): T {
      if (!backend) return defaultValue;
      try {
        const raw = backend.getItem(fullKey);
        if (raw === null) return defaultValue;
        return JSON.parse(raw) as T;
      } catch {
        return defaultValue;
      }
    },

    set(value: T): boolean {
      if (!backend) return false;
      try {
        backend.setItem(fullKey, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    update(fn: (current: T) => T): boolean {
      const next = fn(this.get());
      return this.set(next);
    },

    remove(): boolean {
      if (!backend) return false;
      try {
        backend.removeItem(fullKey);
        return true;
      } catch {
        return false;
      }
    },
  };
}
