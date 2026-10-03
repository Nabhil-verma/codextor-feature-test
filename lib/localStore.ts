import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* One localStorage-backed store primitive.                            */
/*                                                                     */
/* Progress, milestone claims, guild rewards, AI settings and the      */
/* theme all persist the same way: read JSON, guard against corrupt    */
/* or unavailable storage, write a new value, and tell every mounted   */
/* view to re-read. That shape used to be copy-pasted five times; it   */
/* lives here once now.                                                */
/*                                                                     */
/* Parsing stays with the caller — each store validates its own shape  */
/* — but the try/catch, the listener set and the React binding are     */
/* shared, so "storage is broken" can only ever be handled one way.     */
/* ------------------------------------------------------------------ */

type LocalStore<T> = {
  /** Versioned storage key, e.g. `clr-progress-v2`. */
  key: string;
  /** Current value; never throws, even with no storage or corrupt JSON. */
  get(): T;
  set(value: T): void;
  /** Remove the stored value (back to the default). */
  reset(): void;
  subscribe(listener: () => void): () => void;
};

/**
 * Build a store. `parse` turns the raw string (or `null` when nothing is
 * stored) into a value and owns all validation; it runs again with `null`
 * whenever the stored string can't be read or parsed, so a corrupt entry
 * degrades to the default instead of throwing. Contract: `parse(null)` must
 * return the default value and must not throw — it is the fallback path.
 *
 * `serialize` defaults to JSON. A store whose value is a plain string that
 * other code reads directly (the theme, which `index.html` inspects before
 * first paint) passes an identity serializer instead.
 */
export function createLocalStore<T>(
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string = JSON.stringify
): LocalStore<T> {
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const fn of listeners) fn();
  };

  const read = (): T => {
    try {
      return parse(localStorage.getItem(key));
    } catch {
      // Corrupt JSON, or storage that doesn't exist at all (private mode).
      return parse(null);
    }
  };

  return {
    key,
    get: read,
    set(value) {
      try {
        localStorage.setItem(key, serialize(value));
      } catch {
        // Storage unavailable — the value just doesn't persist.
      }
      emit();
    },
    reset() {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** React binding: re-renders the caller whenever the store changes. */
export function useLocalStore<T>(store: LocalStore<T>): T {
  const [value, setValue] = useState(store.get);
  useEffect(() => store.subscribe(() => setValue(store.get())), [store]);
  return value;
}

/**
 * A stored JSON object as a plain record, or `{}` for anything else.
 * Callers validate the fields they care about; this only guarantees that
 * they are looking at an object instead of a string, array or number.
 */
export function readRecord(raw: string | null): Record<string, unknown> {
  if (raw === null || raw === "") return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

/**
 * Rename one storage key: copy the legacy value onto the new key, then delete
 * the legacy entry.
 *
 * Silent by design — it runs at module load, before the stores that own the
 * keys exist, and a storage problem must never interrupt a page. The order is
 * the point: if writing the new key fails, the old value is still there, so
 * data is never orphaned between the two keys. When the new key already holds
 * a value, nothing is touched at all — that is the live copy (the rename
 * already happened, or fresh data was written) and guessing which of the two
 * is newer is exactly how a migration loses someone's work.
 */
export function migrateStorageKey(oldKey: string, newKey: string): void {
  try {
    if (localStorage.getItem(newKey) !== null) return;
    const legacy = localStorage.getItem(oldKey);
    if (legacy === null) return;
    localStorage.setItem(newKey, legacy);
    localStorage.removeItem(oldKey);
  } catch {
    // Storage missing, blocked or full — leave the legacy key in place.
  }
}
