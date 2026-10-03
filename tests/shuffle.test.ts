import { describe, expect, it } from "vitest";
import { shuffled } from "../src/lib/shuffle";

/*
 * Both shuffling exercises rely on this: the assembly card and the
 * drag-to-sequence challenge must never open in the order they are meant to
 * be arranged into. Plain Fisher–Yates gets that wrong often enough to see,
 * which is how a "line out of place" test flaked, so the guarantee is a
 * contract with a test rather than a lucky draw.
 */

describe("shuffled", () => {
  it("never returns the order it was handed", () => {
    const lines = ["open", "body", "close"];
    for (let i = 0; i < 200; i++) {
      expect(shuffled(lines)).not.toEqual(lines);
    }
  });

  it("keeps every element exactly once and leaves the input untouched", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffled(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it("varies, so the puzzle isn't the same arrangement every time", () => {
    const lines = ["open", "body", "close"];
    const seen = new Set(Array.from({ length: 60 }, () => shuffled(lines).join("|")));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("offers no other order when every element is equal", () => {
    expect(shuffled(["x", "x"])).toEqual(["x", "x"]);
    expect(shuffled([])).toEqual([]);
    expect(shuffled(["only"])).toEqual(["only"]);
  });
});
