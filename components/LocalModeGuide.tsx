import { useState } from "react";

type Props = {
  /** The lesson starter code to show in the local setup */
  starterCode?: string;
  /** The lesson title */
  title: string;
  /** Any npm packages needed */
  deps?: string[];
};

export default function LocalModeGuide({ starterCode, title, deps = [] }: Props) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!starterCode) return;
    await navigator.clipboard.writeText(starterCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-ink-200 bg-paper-50 overflow-hidden">
      <div className="border-b border-ink-200 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
          {"\u2328\uFE0F"} pro / local mode
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink-950">
          Run "{title}" on your machine
        </h3>
        <p className="mt-1 text-sm text-ink-600">
          Set up the project locally with VS Code, Node.js, and Git.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {/* Step 1: Prerequisites */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">
            step 1: prerequisites
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            <li className="flex items-center gap-2">
              <span className="text-gold-500">{"\u25B8"}</span>
              Node.js 18+ installed
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold-500">{"\u25B8"}</span>
              VS Code (or any editor)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold-500">{"\u25B8"}</span>
              Git
            </li>
          </ul>
        </div>

        {/* Step 2: Create project */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">
            step 2: create the project
          </p>
          <div className="code-window mt-2 overflow-x-auto">
            <pre className="p-4 font-mono text-[12px] leading-relaxed text-paper-100">
              <code>
                {`# Create project directory
mkdir ${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
cd ${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}

# Initialize with Node
npm init -y${deps.length ? `\n\n# Install dependencies\nnpm install ${deps.join(" ")}` : ""}

# Open in VS Code
code .`}
              </code>
            </pre>
          </div>
        </div>

        {/* Step 3: Copy code */}
        {starterCode && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">
              step 3: add the starter code
            </p>
            <p className="mt-1 text-sm text-ink-600">
              Create an <code className="font-mono text-gold-600">index.js</code> file and paste:
            </p>
            <div className="code-window mt-2 overflow-x-auto">
              <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2">
                <span className="font-mono text-xs text-ink-600">index.js</span>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="font-mono text-[11px] text-gold-600 hover:text-gold-500"
                >
                  {copied ? "copied!" : "copy"}
                </button>
              </div>
              <pre className="max-h-64 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-paper-100">
                <code>{starterCode}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Step 4: Run */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">
            step 4: run it
          </p>
          <div className="code-window mt-2 overflow-x-auto">
            <pre className="p-4 font-mono text-[12px] leading-relaxed text-paper-100">
              <code>node index.js</code>
            </pre>
          </div>
        </div>

        {/* Pro tips */}
        <div className="rounded-xl border border-ink-200 bg-paper-100 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            pro tips
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-600">
            <li>{"\u2022"} Use <code className="font-mono text-gold-600">console.log()</code> for debugging</li>
            <li>{"\u2022"} Set breakpoints in VS Code's debugger (F5)</li>
            <li>{"\u2022"} Run <code className="font-mono text-gold-600">node --inspect index.js</code> for Chrome DevTools</li>
            <li>{"\u2022"} Use <code className="font-mono text-gold-600">git init</code> to start version control</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
