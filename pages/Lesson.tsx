import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { PageFade, Reveal } from "../components/motion";
import LessonBody from "../components/LessonBody";
import Playground from "../components/Playground";
import CssSandbox from "../components/CssSandbox";
import DebugLab from "../components/DebugLab";
import DiffLab from "../components/DiffLab";
import RepoLab from "../components/RepoLab";
import Rubric from "../components/Rubric";
import LivePreview from "../components/LivePreview";
import GitSim from "../components/GitSim";
import PredictOutput from "../components/PredictOutput";
import Quiz from "../components/Quiz";
import SolutionFeed from "../components/SolutionFeed";
import SocraticTutor from "../components/SocraticTutor";
import RapidFire from "../components/gamification/RapidFire";
import DragSort from "../components/gamification/DragSort";
import {
  findTrack,
  findLesson,
  lessonKey,
  type QuizQuestion,
} from "../data";
import { useProgress, useProgressState, scoreFor } from "../lib/progress";
import { recordAttempt, type AttemptElement } from "../lib/telemetry";
import { todayKey } from "../lib/gamification";

export default function Lesson() {
  const { trackId, lessonId } = useParams();
  const track = findTrack(trackId ?? "");
  const lesson = findLesson(trackId ?? "", lessonId ?? "");
  const { record } = useProgress();
  const progressState = useProgressState();
  const [exerciseDone, setExerciseDone] = useState(false);
  const [rapid, setRapid] = useState(false);
  const key = track && lesson ? lessonKey(track.id, lesson.id) : "";

  /*
   * Every graded submission is recorded twice, on purpose. The progress map
   * keeps the best score per lesson (that stays the completion gate); the
   * attempt log keeps which grader produced it, the score and the order —
   * the only way "first attempt" and "did the rubric pass while the quiz did
   * not?" can be answered. Memoised because RapidFire keeps `onScore` in an
   * effect dependency list.
   */
  const scorers = useMemo(() => {
    const forElement = (element: AttemptElement) => (score: number) => {
      if (score > 0) record(key, score, todayKey());
      recordAttempt({ key, element, score, day: todayKey() });
    };
    return {
      quiz: forElement("quiz"),
      debug: forElement("debug"),
      diff: forElement("diff"),
      repo: forElement("repo"),
      rubric: forElement("rubric"),
    };
  }, [key, record]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setExerciseDone(false);
    setRapid(false);
  }, [trackId, lessonId]);

  if (!track || !lesson) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink-950">
            Lesson not found
          </h1>
          <Link to="/learn" className="btn-primary mt-8">
            Back to lessons
          </Link>
        </main>
      </div>
    );
  }

  const idx = track.lessons.findIndex((l) => l.id === lesson.id);
  const prev = track.lessons[idx - 1];
  const next = track.lessons[idx + 1];
  const quiz: QuizQuestion[] = lesson.quiz;

  /*
   * Section numerals are derived from which parts actually render, so adding
   * or removing an interactive block never leaves duplicate or skipped steps.
   */
  const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"];
  const runKind = lesson.starter
    ? "Run"
    : lesson.sandbox
      ? "Play"
      : lesson.gitSim
        ? "Do"
        : null;
  const STEPS = [
    "Read",
    ...(runKind ? [runKind] : []),
    ...(lesson.sort ? ["Sequence"] : []),
    ...(lesson.debug ? ["Debug"] : []),
    ...(lesson.preview ? ["Build"] : []),
    ...(lesson.diff ? ["Review"] : []),
    ...(lesson.repo ? ["Trace"] : []),
    ...(lesson.rubric ? ["Write"] : []),
    "Prove it",
    ...(lesson.starter ? ["Solutions"] : []),
  ];
  const step = (name: string) =>
    ROMAN[STEPS.indexOf(name)] ?? ROMAN[0];

  const completed = scoreFor(progressState, key) >= 1;

  return (
    <div className="min-h-screen">
      <Nav />
      <PageFade>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <motion.p
          className="font-mono text-xs text-ink-600"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link to="/learn" className="hover:text-gold-600">
            lessons
          </Link>{" "}
          / {track.title}
        </motion.p>
        <motion.h1
          className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {lesson.title}
        </motion.h1>
        <motion.p
          className="mt-2 flex items-center gap-3 font-mono text-xs text-ink-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >            <span>{lesson.minutes} min</span>
            <span className="text-gold-500">·</span>
            <span>
              {lesson.starter
                ? lesson.lang === "ts"
                  ? "typescript"
                  : lesson.lang === "python"
                    ? "python"
                    : "interactive"
              : lesson.debug
                ? "break & fix"
                : lesson.diff
                  ? "diff review"
                  : lesson.repo
                    ? "repo trace"
                    : lesson.rubric
                      ? "written"
                      : lesson.preview
                        ? "live build"
                        : lesson.gitSim
                          ? "terminal"
                          : lesson.sandbox
                            ? "visual"
                            : "reading"}
          </span>
          <span className="text-gold-500">·</span>
          {completed ? (
            <span className="text-gold-600">✓ completed</span>
          ) : (
            <span>in progress</span>
          )}
        </motion.p>

        {/* 1. Read */}
        <Reveal className="mt-12">
          <section>
            <h2 className="eyebrow mb-4">{step("Read")} · Read</h2>
            <LessonBody lesson={lesson} />
          </section>
        </Reveal>

        {/* 2. Run — code playground or visual sandbox */}
        {lesson.starter && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Run")} · Run</h2>
              <Playground
                starter={lesson.starter}
                check={lesson.check}
                lang={lesson.lang}
                pythonPrelude={lesson.pythonPrelude}
                onPass={() => setExerciseDone(true)}
              />
            </section>
          </Reveal>
        )}
        {lesson.sandbox && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Play")} · Play</h2>
              <CssSandbox onPass={() => setExerciseDone(true)} />
            </section>
          </Reveal>
        )}
        {lesson.gitSim && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Do")} · Do</h2>
              <GitSim objectives={lesson.gitSim} />
            </section>
          </Reveal>
        )}

        {/* 2.25 Sequence — drag the steps into the right order */}
        {lesson.sort && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Sequence")} · Sequence</h2>
              <DragSort
                prompt={lesson.sort.prompt}
                items={lesson.sort.items}
                explanation={lesson.sort.explanation}
              />
            </section>
          </Reveal>
        )}

        {/* 2.3 Debug — break-and-fix, graded by running the repair */}
        {lesson.debug && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Debug")} · Debug</h2>
              <DebugLab
                challenge={lesson.debug}
                onPass={() => setExerciseDone(true)}
                onScore={scorers.debug}
              />
            </section>
          </Reveal>
        )}

        {/* 2.4 Build — live rendering, graded structurally in the frame */}
        {lesson.preview && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Build")} · Build</h2>
              <LivePreview
                spec={lesson.preview}
                onPass={() => setExerciseDone(true)}
              />
            </section>
          </Reveal>
        )}

        {/* 2.45 Review — multi-file pull request, partial-credit ladder */}
        {lesson.diff && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Review")} · Review</h2>
              <DiffLab
                exercise={lesson.diff}
                onScore={scorers.diff}
                onPass={() => setExerciseDone(true)}
              />
            </section>
          </Reveal>
        )}

        {/* 2.46 Trace — codebase archaeology in a read-only snapshot */}
        {lesson.repo && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Trace")} · Trace</h2>
              <RepoLab
                exercise={lesson.repo}
                onScore={scorers.repo}
                onPass={() => setExerciseDone(true)}
              />
            </section>
          </Reveal>
        )}

        {/* 2.47 Write — written deliverable, rubric-graded */}
        {lesson.rubric && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Write")} · Write</h2>
              <Rubric
                exercise={lesson.rubric}
                onScore={scorers.rubric}
                onPass={() => setExerciseDone(true)}
              />
            </section>
          </Reveal>
        )}

        {/* 2.5 AI Tutor — guided help (optional, BYOK) */}
        {lesson.starter && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">Ask the Tutor</h2>
              <SocraticTutor
                code={lesson.starter}
                checkExpr={lesson.check?.expr}
                checkHint={lesson.check?.hint}
                topic={lesson.title}
              />
            </section>
          </Reveal>
        )}

        {/* 2.6 Predict — mental execution practice */}
        {lesson.predict && lesson.predict.length > 0 && (
          <PredictOutput steps={lesson.predict} />
        )}

        {/* 3. Prove it — standard quiz or the timed rapid-fire gauntlet */}
        <Reveal className="mt-14">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="eyebrow">{step("Prove it")} · Prove it</h2>
              <div
                role="tablist"
                aria-label="Quiz mode"
                className="relative flex rounded-full border border-paper-200/70 bg-paper-50/60 p-1"
              >
                {[
                  { id: false, label: "Standard" },
                  { id: true, label: "⚡ Rapid fire" },
                ].map((m) => (
                  <button
                    key={String(m.id)}
                    type="button"
                    role="tab"
                    aria-selected={rapid === m.id}
                    onClick={() => setRapid(m.id)}
                    className={
                      "relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                      (rapid === m.id
                        ? "text-paper-50"
                        : "text-ink-600 hover:text-ink-950")
                    }
                  >
                    {rapid === m.id && (
                      <motion.span
                        layoutId="quiz-mode"
                        className="absolute inset-0 rounded-full bg-ink-950"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {rapid ? (
              <RapidFire questions={quiz} onScore={scorers.quiz} />
            ) : (
              <Quiz questions={quiz} onScore={scorers.quiz} />
            )}
            {rapid && (
              <p className="mt-3 font-mono text-[11px] text-ink-500">
                10 seconds a question · a combo for consecutive hits · 100% to
                complete the lesson
              </p>
            )}
          </section>
        </Reveal>

        {/* 4. Community solutions (locked until exercise pass) */}
        {lesson.starter && (
          <Reveal className="mt-14">
            <section>
              <h2 className="eyebrow mb-4">{step("Solutions")} · Solutions</h2>
              <SolutionFeed lessonKey={key} passed={exerciseDone || completed} />
            </section>
          </Reveal>
        )}

        {/* Prev / next */}
        {/* On phones the two actions stack — full-width, thumb-sized buttons
            with the primary action on top — and go back to a row from sm up. */}
        <nav className="mt-16 flex flex-col-reverse gap-3 border-t border-paper-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          {prev ? (
            <Link
              to={"/learn/" + track.id + "/" + prev.id}
              className="btn-ghost w-full justify-center !px-5 !py-2.5 text-sm sm:w-auto"
            >
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={"/learn/" + track.id + "/" + next.id}
              className="btn-primary w-full justify-center !px-5 !py-2.5 text-sm sm:w-auto"
            >
              {next.title} →
            </Link>
          ) : (
            <Link to="/learn" className="btn-gold w-full justify-center !px-5 !py-2.5 text-sm sm:w-auto">
              Finish track 🎉
            </Link>
          )}
        </nav>
        {exerciseDone && (
          <motion.p
            className="mt-6 text-center font-mono text-xs text-gold-600"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            exercise passed — finish the quiz with 100% to complete the lesson
          </motion.p>
        )}
      </main>
      </PageFade>
    </div>
  );
}
