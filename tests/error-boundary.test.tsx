// @vitest-environment jsdom
import { Suspense, lazy } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

/*
 * A route's chunk never arriving.
 *
 * The heavy pages are code-split, so "the code for this page failed to
 * download" is a real user-visible state — an offline reload, a wiped CDN
 * cache, hotel wifi. It used to mean a blank shell. These tests pin the
 * contract at both levels:
 *
 *   1. the mechanism: a genuinely rejected dynamic import reaches the panel
 *      boundary with the original error;
 *   2. the wiring: App wraps every route in that boundary, so the failure
 *      stays inside the page slot with plain-English copy, the nav still
 *      standing, and a working retry — never a white screen;
 *   3. the last resort: if even the shell can't render, the app-level
 *      boundary explains the crash and keeps the raw error behind a
 *      disclosure.
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = NoopObserver;
}
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = NoopObserver;
}
if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
window.scrollTo = (() => {}) as typeof window.scrollTo;

const CHUNK_ERROR = vi.hoisted(
  () => "Failed to fetch dynamically imported module: https://codexter.test/assets/Learn-8f3c1a.js"
);

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
});

vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () =>
      ({
        user: { displayName: "Ada", email: "ada@example.com" },
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

/*
 * The Learn page throws the exact error a dropped chunk download produces.
 * (A `vi.mock` factory can't reject for real — vitest wraps the rejection into
 * its own message, which would erase the very copy this test is about — so the
 * real rejected-promise path is pinned by the standalone boundary test below,
 * and this module reproduces its error at render time, which is where React
 * surfaces a rejected lazy import anyway.)
 */
vi.mock("../src/pages/Learn", () => ({
  default: function Learn() {
    throw new Error(CHUNK_ERROR);
  },
}));

// Imported after the mocks so App's lazy() picks up the broken Learn chunk.
import App from "../src/App";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { PanelBoundary } from "../src/components/gamification/Pieces";

const CHUNK = { timeout: 5000 };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

/** Opens one hash route through the real router. */
function open(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe("a route chunk that never arrives", () => {
  it("delivers a rejected dynamic import to the panel boundary", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = lazy(() => Promise.reject(new Error(CHUNK_ERROR)));

    render(
      <PanelBoundary
        fallback={(error, reset) => (
          <div>
            <p>caught: {error.message}</p>
            <button type="button" onClick={reset}>
              retry
            </button>
          </div>
        )}
      >
        <Suspense fallback={<p>still fetching…</p>}>
          <Broken />
        </Suspense>
      </PanelBoundary>
    );

    // The original loader error reaches the fallback — not a wrapped or
    // swallowed one — so the panel can explain it like a person.
    expect(await screen.findByText(`caught: ${CHUNK_ERROR}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "retry" })).toBeTruthy();
    spy.mockRestore();
  });

  it("degrades to App's page-level crash card with the shell still standing", async () => {
    // React logs every caught error; the boundary's job is the UI, not the log.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    open("#/learn");

    expect(await screen.findByRole("button", { name: "Try this page again" }, CHUNK)).toBeTruthy();

    // Plain-English copy instead of the raw loader string…
    expect(screen.getByRole("heading", { name: "Can't reach the server" })).toBeTruthy();
    expect(screen.getByText(/Check your connection/)).toBeTruthy();
    // …with the raw message kept behind the disclosure, out of the way.
    expect(screen.getByText(/technical details/)).toBeTruthy();
    expect(screen.getByText(CHUNK_ERROR)).toBeTruthy();

    // The nav is still rendered, so every other page is one click away.
    expect(screen.getByRole("link", { name: /Codexter/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to lessons" })).toBeTruthy();
    spy.mockRestore();
  });

  it("trying the route again re-renders into the same card, never a blank page", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    open("#/learn");

    fireEvent.click(await screen.findByRole("button", { name: "Try this page again" }, CHUNK));

    // The chunk is still unreachable, so the card comes back — and the shell
    // never unmounts while it retries.
    expect(
      await screen.findByRole("button", { name: "Try this page again" }, CHUNK)
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Codexter/ })).toBeTruthy();
    spy.mockRestore();
  });
});

describe("the last-resort boundary", () => {
  it("explains a hard crash without dumping a stack on the learner", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Boom(): never {
      throw new Error("Cannot read properties of undefined (reading 'map')");
    }

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: "Reload the app" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to lessons" })).toBeTruthy();
    expect(screen.getByText(/technical details/)).toBeTruthy();
    expect(screen.getByText(/Cannot read properties of undefined/)).toBeTruthy();
    spy.mockRestore();
  });
});
