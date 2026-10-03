/**
 * Absolute-URL guard.
 *
 * Convex's client throws `Provided address was not an absolute URL.` when the
 * address it is handed has no scheme — and that throw happens inside a
 * constructor, so it takes the entire app down with it. That was the reported
 * production crash. Every address that reaches a client or a fetch therefore
 * goes through here first: usable input is normalised, anything unusable falls
 * back to a known-good address instead of throwing.
 */

/** Does this parse as an absolute URL with a host? */
export function isAbsoluteUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const value = url.trim();
  // Scheme, then // and a host — and no whitespace or control characters.
  if (/[\s\u0000-\u001f]/.test(value)) return false;
  const m = value.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  return !!m && m[1].length > 0;
}

/**
 * Coerce anything into an absolute URL.
 *
 * - already absolute → returned trimmed
 * - `//host/path`, `/api/users`, `./x` → resolved against the document origin
 *   (or `base`, when passed) and returned without a trailing slash
 * - anything else — `undefined`, `""`, a bare host, a relative-looking string
 *   with no origin to resolve against → `fallback`
 *
 * `fallback` must itself be absolute and is returned untouched, so callers pass
 * a constant that is known to work.
 */
export function toAbsoluteUrl(url: unknown, fallback: string, base?: string): string {
  if (typeof url === "string") {
    const value = url.trim();
    if (isAbsoluteUrl(value)) return value;

    const origin =
      base ??
      (typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : undefined);

    // Only path-like input is resolved: a bare host (`example.convex.cloud`,
    // which is what a dropped scheme leaves behind) is ambiguous, so it falls
    // back to the known-good address instead of resolving to whatever origin
    // the page happens to be on.
    const pathLike = /^(\.{0,2}\/)/.test(value);

    if (pathLike && origin && isAbsoluteUrl(origin)) {
      try {
        const resolved = new URL(value, origin).toString();
        if (isAbsoluteUrl(resolved)) return resolved.replace(/\/$/, "");
      } catch {
        // Not resolvable against the origin — fall through to the fallback.
      }
    }
  }

  return fallback;
}
