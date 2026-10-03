// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/*
 * The two interactive elements the modern tracks are built on, rendered for
 * real through the lesson page.
 *
 * Both are structurally invisible if nothing in the step flow draws them, and
 * that is exactly the bug these tests exist to catch: a `debug` lesson used to
 * render as reading + quiz (the editor and the Run button never appeared, so
 * the challenge was unsolvable) and a `preview` lesson rendered no sandbox at
 * all — the one thing a live-rendering lesson cannot work without.
 */

// jsdom ships neither observer, and framer-motion's whileInView reveals need
// them to exist. `useReducedMotion` reads matchMedia.
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
// The lesson page scrolls to the top on mount; jsdom has no layout.
window.scrollTo = (() => {}) as typeof window.scrollTo;
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

// Optional course panels read live data. Stub the hooks rather than standing up
// a whole backend — the lesson engine is what's under test here.
vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
});

// Every page mounts <Nav/> and the router guard reads the account context.
// Signed in, so the protected routes render instead of bouncing to /auth.
vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () =>
      ({
        user: { email: "ada@example.com", displayName: "Ada" },
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

// Imported after the mocks so the pages pick them up.
import App from "../src/App";
import Lesson from "../src/pages/Lesson";

function renderLesson(trackId: string, lessonId: string) {
  return render(
    <MemoryRouter initialEntries={[`/learn/${trackId}/${lessonId}`]}>
      <Routes>
        <Route path="/learn/:trackId/:lessonId" element={<Lesson />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("the lesson step flow", () => {
  it("renders the break-and-fix lab for a `debug` lesson", () => {
    renderLesson("state", "state-shapes");

    expect(screen.getByRole("heading", { name: /·\s*Debug/ })).toBeTruthy();
    expect(screen.getByText(/debug lab/i)).toBeTruthy();
    expect(screen.getByText(/buggy\.js/)).toBeTruthy();
    // Graded by running the repair, not by revealing an answer.
    expect(screen.getByRole("button", { name: /Run & verify/ })).toBeTruthy();
  });

  it("renders the live sandbox for a `preview` lesson", () => {
    renderLesson("tailwind", "utility-first");

    expect(screen.getByRole("heading", { name: /·\s*Build/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "index.html" })).toBeTruthy();
    expect(screen.getByTitle("Live preview")).toBeTruthy();
  });

  it("only numbers the steps that actually render", () => {
    renderLesson("state", "state-shapes");

    // Read is always first; a break-and-fix lesson has no preview, so there is
    // no Build section and no skipped numeral standing in for one.
    expect(screen.getByRole("heading", { name: "Ⅰ · Read" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /·\s*Build/ })).toBeNull();
    expect(screen.getByRole("heading", { name: /·\s*Prove it/ })).toBeTruthy();
  });
});

/*
 * The project layer is a whole page with its own route. If the route is never
 * declared — or never linked — the milestones exist but no learner can reach
 * them, which is the same as not shipping them.
 */
describe("the project board", () => {
  // Routes are code-split, so the first assertion waits for the chunk.
  it("is served at /projects", async () => {
    window.location.hash = "#/projects";
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "The Continuous Portfolio" })
    ).toBeTruthy();
  });

  it("is linked from the nav", async () => {
    window.location.hash = "#/projects";
    render(<App />);

    expect(await screen.findByRole("link", { name: "Projects" })).toBeTruthy();
  });
});
