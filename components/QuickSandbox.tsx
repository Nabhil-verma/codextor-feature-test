import { useRef, useState } from "react";
import { runUserCode, type RunResult } from "../lib/runner";

const STARTER = `// Try editing this code and press Run\nconst greet = (name) => \`Hello, \${name}! 👋\`;\nconsole.log(greet("you"));\nconsole.log("2 + 2 =", 2 + 2);\n`;

export default function QuickSandbox() {
  const [code, setCode] = useState(STARTER);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const run = async () => {
    setRunning(true);
    setResult(await runUserCode(code));
    setRunning(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void run();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: end } = ta;
      const next = code.slice(0, s) + "  " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  };

  return (
    <div className="code-window shadow-lift">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
          <span className="ml-2 font-mono text-xs text-ink-600">try-it.js</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setCode(STARTER); setResult(null); }}
            className="rounded-full px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-ink-800 hover:text-paper-100"
          >
            reset
          </button>
          <button
            onClick={() => void run()}
            disabled={running}
            className="rounded-full bg-gold-400 px-4 py-1 font-mono text-xs font-bold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
          >
            {running ? "running…" : "▶ Run"}
          </button>
        </div>
      </div>
      <textarea
        ref={taRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
        rows={6}
        className="block w-full resize-y bg-ink-950 p-4 font-mono text-[13px] leading-relaxed text-paper-100 outline-none placeholder:text-ink-600"
        placeholder="Write some JavaScript…"
      />
      <div className="border-t border-ink-800 bg-ink-950 p-4 font-mono text-[13px] leading-relaxed">
        {!result && <p className="text-ink-600">// press Run or ⌘Enter</p>}
        {result?.logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap text-paper-300">
            <span className="mr-2 select-none text-gold-500">›</span>
            {line}
          </div>
        ))}
        {result?.error && (
          <div className="whitespace-pre-wrap text-red-400">✗ {result.error}</div>
        )}
        {result && !result.error && result.logs.length === 0 && (
          <p className="text-ink-600">(no output)</p>
        )}
      </div>
    </div>
  );
}
