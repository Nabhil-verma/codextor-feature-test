import { useState } from "react";
import type { QuizQuestion } from "../data/types";

type Props = {
  questions: QuizQuestion[];
  onScore: (score: number) => void;
};

export default function Quiz({ questions, onScore }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.filter((q, i) => answers[i] === q.answer).length / questions.length;

  const submit = () => {
    setSubmitted(true);
    onScore(score);
  };

  const retry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="card p-7">
      <h3 className="eyebrow">Quiz — prove it</h3>
      <div className="mt-5 space-y-8">
        {questions.map((q, qi) => (
          <fieldset key={qi}>
            <legend className="mb-3 font-display text-lg font-medium text-ink-950">
              {qi + 1}. {q.q}
            </legend>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const isCorrect = submitted && oi === q.answer;
                const isWrongPick = submitted && chosen && oi !== q.answer;
                return (
                  <label
                    key={oi}
                    className={
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition " +
                      (isCorrect
                        ? "border-gold-400 bg-gold-400/10 text-ink-950"
                        : isWrongPick
                          ? "border-red-400 bg-red-50 text-red-700"
                          : chosen
                            ? "border-ink-950 bg-paper-100 text-ink-950"
                            : "border-paper-200 text-ink-700 hover:border-gold-400/60 hover:bg-paper-100")
                    }
                  >
                    <input
                      type="radio"
                      name={"q" + qi}
                      className="accent-gold-500"
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    />
                    <span className="font-mono text-xs text-gold-600">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </label>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
                {q.explanation}
              </p>
            )}
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        {!submitted ? (
          <button
            onClick={submit}
            disabled={!allAnswered}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check answers
          </button>
        ) : (
          <>
            <span
              className={
                "font-mono text-sm font-bold " +
                (score === 1 ? "text-gold-600" : "text-ink-600")
              }
            >
              Score: {questions.filter((q, i) => answers[i] === q.answer).length}/
              {questions.length}
              {score === 1 ? " — flawless." : " — review and retry"}
            </span>
            <button onClick={retry} className="btn-ghost !px-4 !py-1.5 text-sm">
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
