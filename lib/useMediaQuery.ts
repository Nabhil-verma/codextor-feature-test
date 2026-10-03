import { useEffect, useState } from "react";

/**
 * Subscribes to a media query and re-renders when it flips.
 *
 * Safe everywhere: in jsdom (where `matchMedia` may be missing) and during any
 * pre-browser render it simply reports `false`, so the desktop layout is the
 * default and nothing crashes in tests.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    // Safari < 14 only has the deprecated addListener/removeListener pair.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

/**
 * True on phone-sized viewports (the same 768px boundary Tailwind's `md:`
 * uses, so the React branch and the CSS branch can never disagree).
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
