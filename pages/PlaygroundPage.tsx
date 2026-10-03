import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { PageFade, Reveal, Tilt } from "../components/motion";
import Playground from "../components/Playground";
import DebugLab from "../components/DebugLab";
import { DEBUG_CHALLENGES } from "../data/debug-challenges";
import LocalModeGuide from "../components/LocalModeGuide";

const STORAGE_KEY = "clr-playground-code-v1";

const snippets: { name: string; blurb: string; code: string }[] = [
  {
    name: "Blank",
    blurb: "A clean console",
    code: `// Free playground — anything goes.\nconsole.log("hello");`,
  },
  {
    name: "Event loop",
    blurb: "Watch microtasks beat timers",
    code: `console.log("1 sync");

setTimeout(() => console.log("4 timeout"), 0);

Promise.resolve().then(() => console.log("3 microtask"));

console.log("2 sync");
// predict the order before you run!`,
  },
  {
    name: "Mock API",
    blurb: "CRUD against /api/users",
    code: `// A mock REST server is mounted: /api/users (GET/POST/DELETE),
// /api/users/:id, and /api/flaky (fails ~50% of the time).
async function main() {
  const res = await fetch("/api/users");
  const users = await res.json();
  console.log("users:", users.map((u) => u.name).join(", "));

  const created = await (
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Newcomer" }),
    })
  ).json();
  console.log("created:", created.id, created.name);
}
main();`,
  },
  {
    name: "Closures",
    blurb: "Private state, factories",
    code: `function makeWallet(start) {
  let balance = start;        // private
  return {
    spend: (n) => (balance -= n),
    peek: () => balance,
  };
}

const wallet = makeWallet(100);
wallet.spend(30);
wallet.spend(15);
console.log("remaining:", wallet.peek());`,
  },
  {
    name: "Two pointers",
    blurb: "Classic DSA pattern",
    code: `function pairWithSum(sorted, target) {
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;
    else hi--;
  }
  return null;
}

console.log(pairWithSum([1, 3, 5, 8, 12], 13));`,
  },
  {
    name: "Debounce demo",
    blurb: "Promise-based timing",
    code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function toast(msg) {
  console.log("→", msg);
  await sleep(300);
  console.log("✓ done:", msg);
}

await Promise.all([toast("a"), toast("b"), toast("c")]);
console.log("all toasts finished in ~300ms, not 900");`,
  },
];

export default function PlaygroundPage() {
  const [code, setCode] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? snippets[0].code;
    } catch {
      return snippets[0].code;
    }
  });
  const [activeSnippet, setActiveSnippet] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // storage unavailable — session-only persistence
    }
  }, [code]);

  const loadSnippet = (i: number) => {
    setActiveSnippet(i);
    setCode(snippets[i].code);
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <PageFade>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow">Free playground</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-950">
            Break things <span className="gradient-text">safely</span>
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            No lesson, no goals — just a console. Your code autosaves in this
            browser. Timers, promises, and the mock API server all work here.
          </p>
        </motion.div>

        {/* Snippet library */}
        <div className="mt-8 flex flex-wrap gap-1.5">
          {snippets.map((s, i) => (
            <motion.button
              key={s.name}
              onClick={() => loadSnippet(i)}
              title={s.blurb}
              className={
                "rounded-full border px-3.5 py-1.5 font-mono text-xs transition " +
                (activeSnippet === i
                  ? "border-gold-400 bg-gold-400/15 text-gold-700 shadow-glow"
                  : "border-paper-200 text-ink-600 hover:border-gold-400/60 hover:text-ink-900")
              }
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 22 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              {s.name}
            </motion.button>
          ))}
        </div>

        <div className="mt-6" style={{ perspective: "1200px" }}>
          <Tilt max={3} scale={1.005}>
            <Playground
              key={activeSnippet}
              starter={code}
              onCodeChange={setCode}
            />
          </Tilt>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-ink-600">
          Tip · Cmd/Ctrl+Enter runs · Tab indents · infinite loops can't freeze the tab
        </p>

        {/* Run locally guide */}
        <Reveal className="mt-16">
          <section>
            <LocalModeGuide
              title="Playground Snippets"
              starterCode={code}
              deps={[""]}
            />
          </section>
        </Reveal>

        {/* Break-and-fix challenges — graded by running the repair */}
        <Reveal className="mt-16">
          <section>
            <p className="eyebrow text-center">Break &amp; fix</p>
            <h2 className="mt-3 text-center font-display text-3xl font-semibold tracking-tight text-ink-950">
              Find the bugs, fix the code
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-ink-600">
              Every challenge is a real bug that runs cleanly and prints the wrong
              thing. Edit the program, run it, and the fix is graded by behaviour —
              a green run that prints the wrong output still fails.
            </p>
            <div className="mt-10 space-y-10">
              {DEBUG_CHALLENGES.map((bh, i) => (
                <motion.div
                  key={bh.id}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: Math.min(i * 0.08, 0.24), ease: [0.22, 1, 0.36, 1] }}
                >
                  <DebugLab challenge={bh} />
                </motion.div>
              ))}
            </div>
          </section>
        </Reveal>
      </main>
      </PageFade>
    </div>
  );
}
