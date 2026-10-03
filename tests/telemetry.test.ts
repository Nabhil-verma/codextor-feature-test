// @vitest-environment jsdom
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  aggregateAttempts,
  appendAttempt,
  applyCloudAttempts,
  attemptsFor,
  attemptCount,
  bestScore,
  chanceLadderMean,
  elementCompleted,
  firstScore,
  loadMergedAggs,
  loadTelemetry,
  mergeAggregates,
  recordAttempt,
  resetTelemetry,
  reviewGate,
  reviewGateFromAggs,
  type Attempt,
  type AttemptAggs,
} from "../src/lib/telemetry";

/*
 * The progress map keeps a best-ever score, which is exactly the number the
 * pilot's gates cannot use: a persistent guesser converges to full credit
 * without ever demonstrating the skill. This log is what makes
 * "first attempt" and "which element passed" answerable — so it has to be
 * sanitized, capped, and deterministic.
 */

const LESSON = "agents/verifying-agent-output";

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    key: LESSON,
    element: "diff",
    score: 0.4,
    day: "2026-10-03",
    at: 1,
    ...over,
  };
}

afterEach(() => resetTelemetry());

describe("attempt log", () => {
  it("records attempts and reads them back", () => {
    recordAttempt({ key: LESSON, element: "diff", score: 0.4, day: "2026-10-03", at: 10 });
    recordAttempt({ key: LESSON, element: "rubric", score: 1, day: "2026-10-03", at: 20 });

    const t = loadTelemetry();
    expect(t.attempts).toHaveLength(2);
    expect(attemptsFor(t, LESSON, "diff")).toHaveLength(1);
    expect(attemptCount(t, LESSON)).toBe(2);
  });

  it("keeps zero scores — a failed first attempt is the datum the gate needs", () => {
    recordAttempt({ key: LESSON, element: "diff", score: 0, day: "2026-10-03", at: 1 });
    const t = loadTelemetry();
    expect(attemptCount(t, LESSON, "diff")).toBe(1);
    expect(firstScore(t, LESSON, "diff")).toBe(0);
  });

  it("caps the log at the newest N attempts", () => {
    let t = { attempts: [] as Attempt[] };
    for (let i = 0; i < 5; i++) t = appendAttempt(t, attempt({ at: i }), 3);
    expect(t.attempts.map((a) => a.at)).toEqual([2, 3, 4]);
  });

  it("drops malformed stored entries instead of throwing", () => {
    localStorage.setItem(
      "clr-attempts-v1",
      JSON.stringify({
        attempts: [
          attempt({ at: 1 }),
          { key: "", element: "diff", score: 0.4, day: "2026-10-03", at: 2 },
          { key: LESSON, element: "not-a-grader", score: 0.4, day: "2026-10-03", at: 3 },
          { key: LESSON, element: "diff", score: "oops", day: "2026-10-03", at: 4 },
          { key: LESSON, element: "diff", score: 2, day: "2026-10-03", at: 5 },
          null,
        ],
      })
    );
    const t = loadTelemetry();
    // Only the two valid entries survive; the out-of-range score is clamped.
    expect(t.attempts).toHaveLength(2);
    expect(t.attempts[1].score).toBe(1);
  });

  it("rejects entirely invalid input without writing", () => {
    recordAttempt({
      key: LESSON,
      element: "diff",
      score: Number.NaN,
      day: "2026-10-03",
    });
    expect(loadTelemetry().attempts).toHaveLength(0);
  });
});

describe("gate statistics", () => {
  it("reports the first attempt, the best attempt and the attempt count", () => {
    recordAttempt({ key: LESSON, element: "diff", score: 0.4, day: "2026-10-03", at: 10 });
    recordAttempt({ key: LESSON, element: "diff", score: 0.7, day: "2026-10-04", at: 20 });
    recordAttempt({ key: LESSON, element: "diff", score: 1, day: "2026-10-05", at: 30 });

    const gate = reviewGate(loadTelemetry(), LESSON);
    expect(gate.attempts).toBe(3);
    expect(gate.first).toBe(0.4);
    expect(gate.best).toBe(1);
    expect(gate.firstClearedLine).toBe(false);
    expect(gate.firstFullCredit).toBe(false);
  });

  it("attributes completion to the element, not the lesson key", () => {
    recordAttempt({ key: LESSON, element: "quiz", score: 1, day: "2026-10-03", at: 1 });
    const t = loadTelemetry();
    // The whole reason telemetry exists: a flawless quiz completed the lesson
    // key but the rubric has not been attempted at all.
    expect(elementCompleted(t, LESSON, "quiz")).toBe(true);
    expect(elementCompleted(t, LESSON, "rubric")).toBe(false);
    expect(bestScore(t, LESSON, "rubric")).toBe(0);
  });

  it("exposes the chance baseline the ladder must beat", () => {
    // The shipped exercise: 5 files, 101 after-side lines.
    expect(chanceLadderMean(5, 101)).toBeCloseTo(0.0814, 4);
    expect(chanceLadderMean(0, 10)).toBe(0);
    expect(chanceLadderMean(5, 0)).toBe(0);
  });
});

describe("cloud aggregates", () => {
  it("summarises the log into first / best / count per lesson", () => {
    recordAttempt({ key: LESSON, element: "diff", score: 0.4, day: "2026-10-03", at: 10 });
    recordAttempt({ key: LESSON, element: "diff", score: 1, day: "2026-10-03", at: 20 });
    recordAttempt({ key: LESSON, element: "quiz", score: 0.5, day: "2026-10-03", at: 30 });

    const aggs = aggregateAttempts(loadTelemetry());
    expect(aggs[LESSON]).toEqual({ first: 0.4, best: 1, attempts: 3, at: 30 });
  });

  it("keeps the earliest first attempt when two devices merge", () => {
    const deviceA: AttemptAggs = { [LESSON]: { first: 0.4, best: 0.7, attempts: 2, at: 100 } };
    const deviceB: AttemptAggs = { [LESSON]: { first: 1, best: 1, attempts: 1, at: 200 } };

    // B's first attempt happened later, so A's 0.4 is the real first attempt.
    expect(mergeAggregates(deviceA, deviceB)[LESSON].first).toBe(0.4);
    expect(mergeAggregates(deviceB, deviceA)[LESSON].first).toBe(0.4);
    // Best and count take the max either way — commutative.
    expect(mergeAggregates(deviceA, deviceB)[LESSON].best).toBe(1);
    expect(mergeAggregates(deviceB, deviceA)[LESSON].best).toBe(1);
    expect(mergeAggregates(deviceA, deviceB)[LESSON].attempts).toBe(2);
  });

  it("reads the account's aggregates through the gate helper", () => {
    applyCloudAttempts({ [LESSON]: { first: 0.4, best: 1, attempts: 3, at: 30 } });
    const gate = reviewGateFromAggs(loadMergedAggs(), LESSON);
    expect(gate).toMatchObject({
      attempts: 3,
      first: 0.4,
      best: 1,
      firstClearedLine: false,
      firstFullCredit: false,
    });
  });

  it("unions the local log with the account rather than replacing it", () => {
    recordAttempt({ key: LESSON, element: "diff", score: 0.7, day: "2026-10-03", at: 500 });
    // The account knows about an earlier attempt on another machine.
    applyCloudAttempts({ [LESSON]: { first: 0.4, best: 0.4, attempts: 1, at: 100 } });

    const gate = reviewGateFromAggs(loadMergedAggs(), LESSON);
    expect(gate.first).toBe(0.4); // the cloud's earlier attempt wins
    expect(gate.best).toBe(0.7); // the local log's better score survives
    // Counts merge by max, not sum: the two sides may be describing the same
    // attempt, and a sum would inflate on every re-delivery of the same row.
    expect(gate.attempts).toBe(1);

    // Idempotent: applying the same cloud row twice changes nothing.
    applyCloudAttempts({ [LESSON]: { first: 0.4, best: 0.4, attempts: 1, at: 100 } });
    expect(reviewGateFromAggs(loadMergedAggs(), LESSON).attempts).toBe(1);
  });

  it("survives a malformed cloud payload", () => {
    localStorage.setItem(
      "clr-attempts-v1",
      JSON.stringify({
        attempts: [],
        remote: { [LESSON]: { first: "x", best: 1, attempts: 2, at: 1 }, good: { first: 0.4, best: 0.7, attempts: 2, at: 5 } },
      })
    );
    const aggs = loadMergedAggs();
    expect(Object.keys(aggs)).toEqual(["good"]);
  });
});
