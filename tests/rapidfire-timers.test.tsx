// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import type { ReactNode } from "react";
import RapidFire from "../src/components/gamification/RapidFire";
import type { QuizQuestion } from "../src/data/types";

/*
 * Rapid fire is the only mode where the clock can submit an answer for you, so
 * its timing is the product: the reveal beat that holds a locked question
 * before advancing, the countdown that turns a timeout into a miss, a score
 * reported exactly once per run, and a restart that genuinely resets. All of
 * that rides on chained `setTimeout`s, so the suite drives them with fake
 * timers instead of sleeping.
 *
 * Two rendering details are pinned for determinism, neither of which is part
 * of the timing under test: MotionGlobalConfig.skipAnimations makes motion
 * animations resolve instantly, and AnimatePresence renders its children
 * directly so the next question mounts as soon as state says it should.
 * Without those, jsdom's idle animation clock decides when a question is
 * queryable and the assertions would race the animation, not the logic.
 */

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

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

const QUESTIONS: QuizQuestion[] = [
  {
    q: "Which index does an array start at?",
    options: ["0", "1"],
    answer: 0,
    explanation: "Arrays are zero-indexed.",
  },
  {
    q: "What does typeof null return?",
    options: ['"object"', '"null"'],
    answer: 0,
    explanation: "A historical bug kept forever.",
  },
];

/** Advances the faked clock inside React's act, letting chained timers chain. */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/**
 * Picks an option by its own text. The button's accessible name is composed
 * from the label chip and the option with no space between them ("A0"), so
 * matching the option text is both stabler and reads like the learner's view.
 */
function pick(option: string) {
  fireEvent.click(screen.getByText(option));
}

beforeEach(() => {
  vi.useFakeTimers();
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(() => {
  cleanup();
  MotionGlobalConfig.skipAnimations = false;
  vi.useRealTimers();
});

describe("rapid fire timing", () => {
  it("holds a locked question through the reveal beat before advancing", async () => {
    const onScore = vi.fn();
    render(<RapidFire questions={QUESTIONS} onScore={onScore} />);

    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByLabelText("10 seconds left")).toBeTruthy();

    pick("0");
    expect(screen.getByText(/✓ Snapped/)).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();

    // The answer is revealed for a beat — the clock is paused, and the run has
    // not moved on yet.
    await tick(900);
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByLabelText("10 seconds left")).toBeTruthy();

    await tick(50);
    expect(screen.getByText("2/2")).toBeTruthy();
    expect(screen.getByLabelText("10 seconds left")).toBeTruthy();
    expect(onScore).not.toHaveBeenCalled();
  });

  it("turns a run-out clock into a miss and reports the score once at the end", async () => {
    const onScore = vi.fn();
    render(<RapidFire questions={QUESTIONS} onScore={onScore} />);

    // Let the first question expire: ten one-second ticks, then the reveal beat.
    for (let i = 0; i < 10; i++) await tick(1000);
    expect(screen.getByText(/⏱ Too slow/)).toBeTruthy();
    expect(onScore).not.toHaveBeenCalled();

    await tick(950);
    expect(screen.getByText("2/2")).toBeTruthy();

    for (let i = 0; i < 10; i++) await tick(1000);
    await tick(950);

    expect(screen.getByText("The clock won this round")).toBeTruthy();
    expect(screen.getByText("0/2 correct · best combo ×0")).toBeTruthy();
    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(0);

    // Nothing after the summary fires a second report.
    await tick(30_000);
    expect(onScore).toHaveBeenCalledTimes(1);
  });

  it("restarts into a fresh run whose score is reported separately", async () => {
    const onScore = vi.fn();
    render(<RapidFire questions={QUESTIONS} onScore={onScore} />);

    pick("0");
    await tick(950);
    pick('"object"');
    await tick(950);

    expect(screen.getByText("Flawless under pressure")).toBeTruthy();
    expect(screen.getByText("2/2 correct · best combo ×2")).toBeTruthy();
    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: /Run it again/ }));
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByLabelText("10 seconds left")).toBeTruthy();
    // A fresh run has not reported anything yet.
    expect(onScore).toHaveBeenCalledTimes(1);

    pick("0");
    await tick(950);
    pick('"object"');
    await tick(950);

    expect(onScore).toHaveBeenCalledTimes(2);
    expect(onScore).toHaveBeenLastCalledWith(1);
  });
});
