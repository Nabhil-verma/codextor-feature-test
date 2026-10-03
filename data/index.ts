import type { Track } from "./types";
import { debugChallenge } from "./debug-challenges";
import { webTrack } from "./track-web";
import { reactTrack } from "./track-react";
import { backendTrack } from "./track-backend";
import { dsaTrack } from "./track-dsa";
import { pythonTrack } from "./track-python";
import { gitTrack } from "./track-git";
import { testingTrack } from "./track-testing";
import { devopsTrack } from "./track-devops";
import { securityTrack } from "./track-security";
import { architectureTrack } from "./track-architecture";
import { tailwindTrack } from "./track-tailwind";
import { stateTrack } from "./track-state";
import { apiTrack } from "./track-api";
import { typescriptTrack } from "./track-typescript";
import { performanceTrack } from "./track-performance";
import { agentsTrack } from "./track-agents";
import { workflowTrack } from "./track-workflow";

export type { Track, Lesson } from "./types";
export type { Check, QuizQuestion } from "./types";

/*
 * Taxonomy wiring (V2.1 follow-up). Every code that can block executed code
 * now has a graded exercise, attached to the lesson whose subject it belongs
 * to — HA, ID and CX had none, and the legacy off-by-one (EC) existed in the
 * library without ever being rendered. `tests/taxonomy-coverage.test.ts`
 * fails if a code loses its exercise or a wired id stops resolving.
 */
const TAXONOMY_WIRING: Record<string, string> = {
  "web/es6-syntax": "semantics-refactor",
  "dsa/big-o": "quadratic-dedupe",
  "dsa/sorting": "ai-sort-comparator",
  "react/hooks-effect": "invented-helpers",
  "backend/api-security": "trusted-role-header",
};

function wireTaxonomy(track: Track): Track {
  return {
    ...track,
    lessons: track.lessons.map((lesson) => {
      const id = TAXONOMY_WIRING[`${track.id}/${lesson.id}`];
      if (!id) return lesson;
      return { ...lesson, debug: debugChallenge(id) };
    }),
  };
}

export const tracks: Track[] = [
  webTrack,
  reactTrack,
  backendTrack,
  dsaTrack,
  pythonTrack,
  gitTrack,
  testingTrack,
  devopsTrack,
  securityTrack,
  architectureTrack,
  tailwindTrack,
  stateTrack,
  apiTrack,
  typescriptTrack,
  performanceTrack,
  agentsTrack,
  workflowTrack,
].map(wireTaxonomy);

export function findTrack(trackId: string) {
  return tracks.find((t) => t.id === trackId);
}

export function findLesson(trackId: string, lessonId: string) {
  return findTrack(trackId)?.lessons.find((l) => l.id === lessonId);
}

export function lessonKey(trackId: string, lessonId: string) {
  return trackId + "/" + lessonId;
}

export const totalLessonCount = tracks.reduce((n, t) => n + t.lessons.length, 0);
