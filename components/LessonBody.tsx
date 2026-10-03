import CodeBlock from "./CodeBlock";
import type { Lesson } from "../data/types";

function Inline({ text }: { text: string }) {
  // Split on `code` and **bold** segments
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded-md bg-paper-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gold-700"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-ink-950">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default function LessonBody({ lesson }: { lesson: Lesson }) {
  // Fenced ``` blocks render as code; other paragraphs render as prose.
  const segments = lesson.body.split(/```(?:\w*\n)?([\s\S]*?)```/g);

  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-ink-700">
      {segments.map((seg, i) =>
        i % 2 === 1 ? (
          <CodeBlock key={i} code={seg.replace(/\n$/, "")} />
        ) : (
          seg
            .split(/\n\n+/)
            .filter((p) => p.trim())
            .map((para, j) => (
              <p key={j} className="whitespace-pre-line">
                <Inline text={para.trim()} />
              </p>
            ))
        )
      )}
    </div>
  );
}
