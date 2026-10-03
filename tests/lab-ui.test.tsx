// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/*
 * The three V2.1 lab surfaces — diff review, repo trace and rubric write-up —
 * shipped without a single render test. The data invariants and the grading
 * ladders were covered; the *wiring* was not, and wiring is how a lesson
 * silently degrades into reading + quiz (the bug the debug/preview tests were
 * written to catch). These tests render real Track XVI lessons through the
 * real lesson page and assert each lab appears with its submission control.
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
        user: { email: "ada@example.com", displayName: "Ada" },
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

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

afterEach(cleanup);

describe("Track XVI labs render through the lesson page", () => {
  it("renders the diff review with its submit control", () => {
    renderLesson("agents", "verifying-agent-output");

    expect(screen.getByRole("heading", { name: /·\s*Review/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Submit review/ })).toBeTruthy();
  });

  it("renders the repo trace with its submit control", () => {
    renderLesson("agents", "codebase-archaeology");

    expect(screen.getByRole("heading", { name: /·\s*Trace/ })).toBeTruthy();
    // One submit control per question — the trace lab renders several.
    expect(
      screen.getAllByRole("button", { name: /Submit answer/ }).length
    ).toBeGreaterThan(0);
  });

  it("renders the rubric write-up with its draft box", () => {
    renderLesson("agents", "specs-and-prompts");

    expect(screen.getByRole("heading", { name: /·\s*Write/ })).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Submit draft/ })).toBeTruthy();
  });

  it("opens a lesson that has both a lab and a quiz (the capstone)", () => {
    renderLesson("agents", "capstone-agent-loop");

    expect(screen.getByRole("heading", { name: /·\s*Debug/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /·\s*Prove it/ })).toBeTruthy();
  });
});

describe("the Wave 1 additions render", () => {
  it("renders the Python lesson with its own editor and runtime note", () => {
    renderLesson("python", "python-llm-api");

    expect(screen.getByRole("heading", { name: /·\s*Run/ })).toBeTruthy();
    expect(screen.getByText(/editor\.py/)).toBeTruthy();
    expect(screen.getByText(/Pyodide/)).toBeTruthy();
    // The JS-only trace toggle must not appear for a Python exercise.
    expect(screen.queryByText(/visual execution trace/)).toBeNull();
  });

  it("renders the workflow diff review with its submit control", () => {
    renderLesson("workflow", "reviewing-diffs");

    expect(screen.getByRole("heading", { name: /·\s*Review/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Submit review/ })).toBeTruthy();
  });

  it("renders the testing station's diff alongside its own repair lab", () => {
    renderLesson("testing", "debug-the-bug");

    expect(screen.getByRole("heading", { name: /·\s*Run/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /·\s*Review/ })).toBeTruthy();
  });
});
