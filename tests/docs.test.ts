import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { tracks, totalLessonCount } from "../src/data";

/*
 * The roadmap drifted: it still claims "15 tracks, 86 lessons" and "171 tests
 * across 17 files" while the app ships 16/95 and a 257-test suite. Counts in
 * prose rot silently because nothing checks them, so the README's headline
 * numbers are now pinned to the registry they describe.
 */

describe("documented curriculum counts", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  it("matches the track and lesson counts in the registry", () => {
    expect(readme).toContain(
      `${tracks.length} curriculum tracks, ${totalLessonCount} lessons`
    );
  });

  it("counts every track in the catalog table at least once", () => {
    const lower = readme.toLowerCase();
    for (const t of tracks) {
      expect(lower, `README never mentions the ${t.id} track`).toContain(
        t.title.toLowerCase()
      );
    }
  });
});
