import { useCallback, useRef, useState } from "react";
import { callAi, loadAiSettings, useAiSettings, type TutorMessage } from "../lib/ai";

type Props = {
  /** The student's current code in the editor. */
  code: string;
  /** The exercise's check expression (so the tutor knows the goal). */
  checkExpr?: string;
  /** The hint from the exercise. */
  checkHint?: string;
  /** The error from the last run (if any). */
  error?: string | null;
  /** Console output from the last run. */
  logs?: string[];
  /** Lesson topic for context. */
  topic?: string;
};

const SOCRATIC_SYSTEM = `You are a Socratic programming tutor. Your ONLY job is to guide the student toward discovering the answer themselves.

CRITICAL RULES:
- NEVER write code for the student. Not even a snippet. Not even "try this".
- NEVER give the answer directly.
- Ask ONE focused question at a time that helps them notice something in their own code.
- Reference specific line numbers when possible.
- If there's an error, help them read and understand it — don't explain what the fix is.
- If their code is correct, ask a deepening question to build understanding.
- Keep responses under 3 sentences.
- Be warm and encouraging. Treat mistakes as learning opportunities.
- If they seem stuck after 3 exchanges, give a very broad conceptual nudge (still no code).`;

/** Recent turns kept in the prompt — an unbounded history blows the context. */
const MAX_TURNS = 12;

/** Clip lesson context so one huge console dump can't blow the context window. */
function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "\n… (truncated)";
}

export default function SocraticTutor({
  code,
  checkExpr,
  checkHint,
  error,
  logs,
  topic,
}: Props) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Subscribed through the store hook, so adding or removing a provider in
  // Settings re-renders this panel — the subscription is owned by exactly one
  // effect inside `useLocalStore`, never re-created per render.
  const settingsReady = !!useAiSettings().provider;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const askTutor = useCallback(
    async (studentMessage: string) => {
      const settings = loadAiSettings();
      if (!settings.provider || !settings.keys[settings.provider]) return;

      const name = settings.tutorName || "student";
      const systemMsg: TutorMessage = {
        role: "system",
        content: `${SOCRATIC_SYSTEM}\n\nContext: The student${name ? ` (${name})` : ""} is working${topic ? ` on "${topic}"` : ""}.\n\nTheir current code:\n\`\`\`javascript\n${clip(code, 2000)}\n\`\`\`\n\n${checkExpr ? `Exercise goal (check expression): ${checkExpr}` : ""}\n${checkHint ? `Exercise hint: ${checkHint}` : ""}\n${error ? `Last error: ${error}` : ""}\n${logs?.length ? `Console output:\n${clip(logs.slice(-40).join("\n"), 1500)}` : ""}`,
      };

      // Sliding window: only the most recent turns go to the provider.
      const recent = messages
        .filter((m) => m.role !== "system")
        .slice(-MAX_TURNS);
      const newMessages: TutorMessage[] = [
        systemMsg,
        ...recent,
        { role: "user", content: studentMessage },
      ];

      setMessages((prev) => [
        ...prev,
        { role: "user", content: studentMessage },
      ]);
      setInput("");
      setBusy(true);

      try {
        const reply = await callAi(newMessages, settings);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "AI call failed";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `[${errMsg.includes("API") ? "API Error" : "Error"}] ${errMsg}. Check your API key in Settings.`,
          },
        ]);
      } finally {
        setBusy(false);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
        });
      }
    },
    [code, checkExpr, checkHint, error, logs, messages, topic],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (input.trim() && !busy) {
        void askTutor(input.trim());
      }
    }
  };

  if (!settingsReady) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-paper-50 p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
          Socratic AI Tutor
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Optional: add a Gemini or Claude API key in Settings to enable guided help.
        </p>
        <p className="mt-1 text-xs text-ink-400">
          The tutor asks questions to guide you &mdash; it never writes code for you.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-paper-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-400/15 text-sm">
            {"\u2728"}
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-ink-950">
              Socratic Tutor
            </p>
            <p className="font-mono text-[10px] text-ink-500">
              asks questions, never writes code
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="font-mono text-[11px] text-ink-500 hover:text-ink-800"
          >
            clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-72 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-ink-500">
              Stuck on your code? Ask the tutor for a hint.
            </p>
            <p className="mt-1 text-xs text-ink-400">
              It will guide you with questions &mdash; not solutions.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "I'm stuck, can you help?",
                "What's wrong with my code?",
                "I don't understand the error",
                "How should I think about this?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void askTutor(q)}
                  className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition hover:border-gold-400 hover:text-gold-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-ink-950 text-paper-100"
                  : "bg-paper-100 text-ink-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-paper-100 px-4 py-2.5 text-sm text-ink-500">
              thinking{"\u2026"}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-ink-200 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-ink-200 bg-paper-50 px-3 py-2 text-sm text-ink-900 outline-none focus:border-gold-400"
            placeholder="Ask a question about your code..."
          />
          <button
            type="button"
            onClick={() => {
              if (input.trim() && !busy) void askTutor(input.trim());
            }}
            disabled={busy || !input.trim()}
            className="self-end rounded-full bg-gold-400 px-4 py-2 font-mono text-xs font-bold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
          >
            ask
          </button>
        </div>
        <p className="mt-1.5 text-center font-mono text-[10px] text-ink-400">
          {"\u2318"}Enter to send &middot; tutor never writes code for you
        </p>
      </div>
    </div>
  );
}
