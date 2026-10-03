// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/*
 * Every declared route, rendered for real.
 *
 * A route that exists but throws on mount, or that only works with a warm
 * backend, is a broken page for whoever lands on it first — so each one is
 * opened through the actual router with the network stubbed out, including the
 * states nobody types on purpose: a lesson id that doesn't exist, a track with
 * no certificate, and an unknown URL.
 *
 * Routes are code-split, so every assertion waits for its chunk.
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

/** Flipped per test: the signed-out state is a route state of its own. */
const auth = vi.hoisted(() => ({ signedIn: true }));

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    // undefined = "still loading" is the cold-backend state every panel must
    // survive, so that is the state these routes are opened in.
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
        user: auth.signedIn ? { displayName: "Ada", email: "ada@example.com" } : null,
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

// Imported after the mocks so the router picks them up.
import App from "../src/App";

const CHUNK = { timeout: 5000 };

beforeEach(() => {
  localStorage.clear();
  auth.signedIn = true;
});

afterEach(() => {
  cleanup();
  auth.signedIn = true;
  window.location.hash = "";
});

/** Opens one hash route through the real router. */
function open(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe("every route renders", () => {
  it("/ — the public landing page", async () => {
    open("#/");
    expect(
      await screen.findByRole("heading", { name: "The code teacher that runs your code" }, CHUNK)
    ).toBeTruthy();
  });

  it("/auth — the signed-out sign-in page", async () => {
    auth.signedIn = false;
    open("#/auth");
    expect(await screen.findByRole("heading", { name: /Welcome back/ }, CHUNK)).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByLabelText(/Password/)).toBeTruthy();
  });

  it("/auth — signed in, it forwards to the app instead of looping", async () => {
    open("#/auth?returnTo=%2Flearn");
    expect(await screen.findByRole("heading", { name: "All lessons" }, CHUNK)).toBeTruthy();
  });

  it("/learn — the track index with a cold backend", async () => {
    open("#/learn");
    expect(await screen.findByRole("heading", { name: "All lessons" }, CHUNK)).toBeTruthy();
  });

  it("/learn/:trackId/:lessonId — a lesson that doesn't exist says so", async () => {
    open("#/learn/web/nope-not-a-lesson");
    expect(await screen.findByRole("heading", { name: /Lesson not found/ }, CHUNK)).toBeTruthy();
  });

  it("/playground — the free editor", async () => {
    open("#/playground");
    expect(
      await screen.findByRole("heading", { name: /Break things safely/ }, CHUNK)
    ).toBeTruthy();
  });

  it("/certificate/:trackId — nothing finished yet is a state, not an error", async () => {
    open("#/certificate/web");
    expect(
      await screen.findByRole("heading", { name: /lessons complete/ }, CHUNK)
    ).toBeTruthy();
  });

  it("/certificate/:trackId — an unknown track explains itself", async () => {
    open("#/certificate/nope");
    expect(
      await screen.findByRole("heading", { name: /Certificate not found/ }, CHUNK)
    ).toBeTruthy();
  });

  it("/projects — the continuous portfolio board", async () => {
    open("#/projects");
    expect(
      await screen.findByRole("heading", { name: "The Continuous Portfolio" }, CHUNK)
    ).toBeTruthy();
  });

  it("/portfolio — the learner's own profile", async () => {
    open("#/portfolio");
    expect(await screen.findByRole("heading", { name: "Ada" }, CHUNK)).toBeTruthy();
  });

  it("/leaderboard — the board with no rows yet", async () => {
    open("#/leaderboard");
    expect(
      await screen.findByRole("heading", { name: "Global leaderboard" }, CHUNK)
    ).toBeTruthy();
  });

  it("/clans — the guild hall", async () => {
    open("#/clans");
    expect(
      await screen.findByRole("heading", { name: "Study in a pack" }, CHUNK)
    ).toBeTruthy();
  });

  it("* — an unknown URL is a 404, not a blank page", async () => {
    open("#/definitely-not-a-route");
    expect(
      await screen.findByRole("heading", { name: /page not found/ }, CHUNK)
    ).toBeTruthy();
  });
});
