// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/*
 * The fixes behind the first cohort's complaints, pinned down:
 *
 *   1. a panel whose backend function is missing (the "Could not find public
 *      function for 'clans:mine'" crash) degrades to an explanation instead of
 *      taking the whole app down;
 *   2. the crash copy is plain English, not a raw Convex string;
 *   3. quick practice has a Previous button, a hint, targeted feedback, and
 *      counts solved questions;
 *   4. "Start a quest" leads to the next unfinished lesson, not back to the
 *      page it's already on;
 *   5. the nav theme toggle flips the palette and remembers the choice.
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

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
});

// The landing page reads the account context for its continue card.
vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () =>
      ({
        user: null,
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

import Landing from "../src/pages/Landing";
import MicroPractice from "../src/components/MicroPractice";
import QuestBoard from "../src/components/gamification/QuestBoard";
import { PanelBoundary } from "../src/components/gamification/Pieces";
import ThemeToggle from "../src/components/ThemeToggle";
import { missingFunctionName, panelMessage } from "../src/lib/friendlyError";
import { tracks } from "../src/data";

afterEach(cleanup);

/* ---------------------- 1 · a missing backend function ---------------------- */

const CONVEX_MISSING =
  "[CONVEX Q(clans:mine)] [Request ID: b63590e3db458028] Server Error\n" +
  "Could not find public function for 'clans:mine'.\n\n  Called by client";

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

describe("a stale backend degrades instead of white-screening", () => {
  it("turns the Convex missing-function error into something a learner can read", () => {
    const msg = panelMessage(new Error(CONVEX_MISSING));
    expect(msg.title).toBe("This feature needs a newer server");
    expect(msg.body).toMatch(/before its Convex functions were deployed/);
    expect(msg.body).not.toMatch(/CONVEX|Request ID/);
    expect(missingFunctionName(CONVEX_MISSING)).toBe("clans:mine");
  });

  it("renders that explanation in place of a crashed panel, keeping the page alive", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <p>rest of the page</p>
        <PanelBoundary>
          <Boom message={CONVEX_MISSING} />
        </PanelBoundary>
      </div>
    );

    expect(screen.getByText("rest of the page")).toBeTruthy();
    expect(screen.getByText("This feature needs a newer server")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    spy.mockRestore();
  });

  it("never explains an unrelated failure as a missing backend function", () => {
    const msg = panelMessage(new Error("Failed to fetch"));
    expect(msg.title).toBe("Can't reach the server");
  });
});

/* ---------------------------- 2 · quick practice ---------------------------- */

/** Rows of the assembly card, in the order they're currently rendered. */
function rowsOf(card: HTMLElement): HTMLElement[] {
  const seen: HTMLElement[] = [];
  for (const button of card.querySelectorAll<HTMLElement>('[aria-label^="Move line"]')) {
    const row = button.parentElement;
    if (row && seen[seen.length - 1] !== row) seen.push(row);
  }
  return seen;
}

function lineIn(row: HTMLElement): string {
  const spans = row.querySelectorAll("span");
  return spans[spans.length - 1]?.textContent ?? "";
}

/** Puts the shuffled lines into the target order using the ▲ buttons. */
function arrangeTo(card: HTMLElement, target: string[]) {
  for (let i = 0; i < target.length; i++) {
    for (let guard = 0; guard < 12; guard++) {
      const rows = rowsOf(card);
      const at = rows.findIndex((row) => lineIn(row) === target[i]);
      if (at <= i) break;
      const up = rows[at].querySelector<HTMLElement>('[aria-label^="Move line"]');
      if (!up) break;
      fireEvent.click(up);
    }
  }
}

function assemblyCard(): HTMLElement {
  const prompt = screen.getByText(/Arrange these lines to print the numbers 1 through 5/);
  return prompt.parentElement as HTMLElement;
}

describe("quick practice", () => {
  it("has a Previous button that goes back, and a Next button that goes on", () => {
    render(<MicroPractice />);

    const prev = screen.getByRole("button", { name: /Previous/ });
    const next = screen.getByRole("button", { name: /Next/ });
    expect(prev.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/micro practice · 1\/6/)).toBeTruthy();

    fireEvent.click(next);
    expect(screen.getByText(/micro practice · 2\/6/)).toBeTruthy();
    expect(screen.getByText("Match each keyword to its purpose:")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Previous/ }));
    expect(screen.getByText(/micro practice · 1\/6/)).toBeTruthy();
  });

  it("hands out the reasoning on request instead of as an error message", () => {
    render(<MicroPractice />);
    expect(screen.queryByText(/JavaScript reads top to bottom/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /need a hint/ }));
    expect(screen.getByText(/JavaScript reads top to bottom/)).toBeTruthy();
  });

  it("names the first line out of place, then confirms the fix", () => {
    render(<MicroPractice />);
    const card = assemblyCard();

    // The card opens on a random arrangement (never the solved one), so the
    // wrong order is built rather than assumed. Swapping the rendered first
    // two rows instead used to *fix* the puzzle whenever the shuffle had
    // already produced that order — a 1-in-6 flake; transposing the first two
    // lines makes row 1 provably the first one out of place.
    arrangeTo(card, [
      "  console.log(i);",
      "for (let i = 1; i <= 5; i++) {",
      "}",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Check order" }));
    expect(screen.getByText(/Line 1 is the first one out of place/)).toBeTruthy();
    expect(screen.queryByText(/✓ correct/)).toBeNull();

    // Then put it in the correct run order.
    arrangeTo(card, [
      "for (let i = 1; i <= 5; i++) {",
      "  console.log(i);",
      "}",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Check/ }));
    expect(screen.getByText(/✓ correct/)).toBeTruthy();
    expect(screen.getByText(/The for header sets up the counter/)).toBeTruthy();
    expect(screen.getByText(/1 solved/)).toBeTruthy();
  });

  it("moves a line both ways with the arrow buttons", () => {
    render(<MicroPractice />);
    const card = assemblyCard();

    const before = rowsOf(card).map(lineIn);
    fireEvent.click(screen.getByRole("button", { name: "Move line 2 down" }));
    expect(rowsOf(card).map(lineIn)).toEqual([before[0], before[2], before[1]]);
    // Labels are positional, so the inverse of moving row 2 down is moving
    // the row that took its place (now row 3) back up.
    fireEvent.click(screen.getByRole("button", { name: "Move line 3 up" }));
    expect(rowsOf(card).map(lineIn)).toEqual(before);

    // The ends can't move outward.
    expect(
      screen.getByRole("button", { name: "Move line 1 up" }).hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Move line 3 down" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("grades a spot-the-bug question on the broken line, not a reveal button", () => {
    render(<MicroPractice />);
    fireEvent.click(screen.getByRole("button", { name: /Next/ })); // 2
    fireEvent.click(screen.getByRole("button", { name: /Next/ })); // 3 — string maths

    fireEvent.click(screen.getByRole("button", { name: /const a = 6/ }));
    expect(screen.getByText(/Not that one/)).toBeTruthy();
    expect(screen.queryByText(/✓ correct/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /console\.log\("a \+ b"\)/ }));
    expect(screen.getByText(/✓ correct/)).toBeTruthy();
    expect(screen.getByText(/string literal/)).toBeTruthy();
  });
});

/* --------------------------- 3 · start a quest --------------------------- */

describe("the quest board call to action", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("links at the next unfinished lesson instead of the page it sits on", () => {
    render(
      <MemoryRouter>
        <QuestBoard />
      </MemoryRouter>
    );

    const cta = screen.getByRole("link", { name: /Start a quest/ });
    const first = tracks[0].lessons[0];
    expect(cta.getAttribute("href")).toBe(`/learn/${tracks[0].id}/${first.id}`);
    expect(cta.getAttribute("href")).not.toBe("/learn");
  });
});

/* --------------------------- 4 · landing hero --------------------------- */

describe("the landing hero", () => {
  it("still renders after the scroll-fade rework, with the toggle in reach", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("heading", { name: "The code teacher that runs your code" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Switch to (dark|light) mode/ })).toBeTruthy();
  });
});

/* ------------------------------ 5 · theme ------------------------------ */

describe("the theme toggle", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("flips the dark class and remembers it", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /Switch to dark mode/ });

    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("codexter-theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: /Switch to light mode/ }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("codexter-theme")).toBe("light");
  });
});
