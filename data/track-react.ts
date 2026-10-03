import type { Track } from "./types";

export const reactTrack: Track = {
  id: "react",
  title: "Modern Frontend: React",
  blurb: "Components, hooks, and the mental model behind every modern interface.",
  numeral: "Ⅱ",
  lessons: [
    {
      id: "jsx-vdom",
      title: "JSX & the Virtual DOM",
      minutes: 10,
      reading: true,
      body: `React's core idea: **describe the UI for the current state**, and let React update the page.

**JSX** is JavaScript with HTML-like syntax that compiles to function calls:

\`\`\`
const el = <h1 className="title">Hello, {user.name}</h1>;
// really: React.createElement("h1", { className: "title" }, "Hello, ", user.name)
\`\`\`

The rules: \`className\` not \`class\`, braces \`{}\` embed any expression, and components are just **functions returning JSX**:

\`\`\`
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>;
}
\`\`\`

**The Virtual DOM:** React keeps a lightweight JS tree of your UI. On state change it re-renders the component, diffs the new tree against the old one, and patches **only what changed** in the real DOM. You never call DOM APIs for UI updates — no \`document.querySelector\`, ever, in React code.

**Rendering a list** needs a stable \`key\` so the diff algorithm tracks identity across re-renders:

\`\`\`
{todos.map((todo) => (
  <li key={todo.id}>{todo.text}</li>
))}
\`\`\`

Use IDs, never array indexes, when items can reorder — index keys confuse the diff and cause state to stick to the wrong row.`,
      quiz: [
        {
          q: "JSX compiles down to…",
          options: ["HTML strings", "Function calls like React.createElement", "Web Components", "CSS rules"],
          answer: 1,
          explanation:
            "JSX is syntactic sugar over element-creating function calls.",
        },
        {
          q: "The Virtual DOM exists to…",
          options: [
            "Make the DOM faster by patching only what changed",
            "Replace the browser",
            "Store your data",
            "Style components",
          ],
          answer: 0,
          explanation:
            "Diffing a JS tree is cheaper than touching the real DOM — React computes the minimal patch.",
        },
        {
          q: "Why do lists need key props?",
          options: [
            "For CSS selectors",
            "So the diff algorithm can track item identity across renders",
            "For TypeScript",
            "Keys are optional decoration",
          ],
          answer: 1,
          explanation:
            "Keys tell React which item is which when the list changes.",
        },
        {
          q: "Which is correct in JSX?",
          options: ['<div class="box">', '<div className="box">', '<div css="box">', '<div .box>'],
          answer: 1,
          explanation: "class is a reserved word in JS, so JSX uses className.",
        },
        {
          q: "In React, updating the UI is done by…",
          options: [
            "Calling document.querySelector directly",
            "Changing state — React re-renders and patches",
            "Editing innerHTML strings",
            "Reloading the page",
          ],
          answer: 1,
          explanation:
            "State drives the render; the DOM is React's responsibility.",
        },
      ],
    },
    {
      id: "props-state",
      title: "Props vs State: The Data Contracts",
      minutes: 10,
      body: `**Props** are inputs — read-only, passed down, owned by the parent. **State** is memory — owned by the component, changes trigger re-renders.

\`\`\`
function Counter({ label, start = 0 }) {   // props: the contract
  const [count, setCount] = useState(start); // state: the memory
  return (
    <button onClick={() => setCount(count + 1)}>
      {label}: {count}
    </button>
  );
}
\`\`\`

**The golden rule: lift state up.** When two siblings need the same data, the state moves to their closest common parent and flows down as props:

\`\`\`
function App() {
  const [query, setQuery] = useState("");
  return (
    <>
      <SearchBox query={query} onQueryChange={setQuery} />
      <Results query={query} />
    </>
  );
}
\`\`\`

The \`SearchBox\` stays "dumb" — it receives a value and reports changes. That's a **controlled component**: the parent owns truth, the child renders it. Forms work exactly this way (\`value\` + \`onChange\`).

Never mutate props, never mutate state (\`setCount(count + 1)\` not \`count++\`) — React detects changes by **reference**, so always pass a new object/array:

\`\`\`
setTodos([...todos, newTodo]);       // new array ✓
setTodos(todos.push(newTodo));       // mutation ✗ (no re-render)
\`\`\``,
      starter: `// Plain-JS simulation of useState + props — the model matters, not the library.
let rerenders = 0;

function useState(initial) {
  let value = initial;
  function setValue(next) {
    value = next;
    rerenders++;
  }
  return [() => value, setValue];
}

// A "component" with props (label) and state (count)
function makeCounter(props) {
  const [getCount, setCount] = useState(props.start);
  return {
    click: () => setCount(getCount() + 1),
    render: () => props.label + ": " + getCount(),
  };
}

const counter = makeCounter({ label: "Clicks", start: 0 });
console.log(counter.render());
counter.click();
counter.click();
counter.click();
console.log(counter.render());
console.log("re-renders triggered:", rerenders);`,
      check: {
        expr: "output.includes('Clicks: 0') && output.includes('Clicks: 3') && output.includes('re-renders triggered: 3')",
        hint: "Each click must call setCount — the render should go 0 → 3 with 3 re-renders.",
      },
      quiz: [
        {
          q: "Props are…",
          options: [
            "Mutable component memory",
            "Read-only inputs owned by the parent",
            "Global variables",
            "DOM attributes only",
          ],
          answer: 1,
          explanation:
            "Props are the component's contract — children never rewrite their props.",
        },
        {
          q: "Changing state correctly means…",
          options: [
            "state.push(item)",
            "Calling the setter with a NEW value/array",
            "Editing the state variable directly",
            "Mutating and forcing a render",
          ],
          answer: 1,
          explanation:
            "React compares references — mutate in place and it sees 'no change'.",
        },
        {
          q: "Two siblings need the same data. You should…",
          options: [
            "Duplicate state in each",
            "Use a global variable",
            "Lift state to the closest common parent",
            "Pass it through the DOM",
          ],
          answer: 2,
          explanation:
            "Lifting state up keeps one source of truth flowing down.",
        },
        {
          q: "A controlled input is one where…",
          options: [
            "The browser owns the value",
            "React state owns the value via value + onChange",
            "The value is read on submit",
            "The input is disabled",
          ],
          answer: 1,
          explanation:
            "Value from state, changes reported upward — the parent owns truth.",
        },
        {
          q: "Calling setCount(count + 1) twice in a row updates by…",
          options: [
            "+2 always",
            "Possibly +1 twice if you use the function form: setCount(c => c + 1)",
            "Nothing — state can't change",
            "It throws",
          ],
          answer: 1,
          explanation:
            "The updater form (c => c + 1) queues correctly; the value form can batch stale reads.",
        },
      ],
    },
    {
      id: "hooks-effect",
      title: "Hooks in Depth: useEffect & Friends",
      minutes: 12,
      sort: {
        prompt: "Order what React actually does when an effect re-runs.",
        items: [
          "the component function runs and returns JSX",
          "React commits the new DOM to the screen",
          "the previous effect's cleanup function runs",
          "the new effect callback runs",
        ],
        explanation:
          "Render, then commit, then cleanup, then effect. Effects never block the paint — that ordering is exactly why the dependency array matters.",
      },
      reading: true,
      body: `Hooks let function components hold state and perform **side effects**.

**useEffect** runs *after* render for anything outside React: fetching, subscriptions, timers, logging.

\`\`\`
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);  // cleanup runs before the next effect + unmount
}, []);                            // dependency array
\`\`\`

The dependency array is the whole contract:
- **\`[]\`** — run once on mount
- **\`[userId]\`** — re-run when userId changes (cleanup first!)
- **none** — run after *every* render (rarely what you want)

**Other core hooks:**
- \`useRef\` — a mutable box that survives re-renders *without* triggering one; also grabs DOM nodes (\`inputRef.current.focus()\`).
- \`useContext\` — read a context value without prop-drilling through every layer.
- \`useReducer\` — \`useState\` with a formal reducer: \`dispatch({ type: "add", item })\` → pure \`(state, action) => newState\`. Prefer it when state transitions get complex.

**The rules of hooks:** call them unconditionally at the top level — same order every render. No hooks inside \`if\`, loops, or nested functions; React tracks hooks by call order.

**Custom hooks** are functions starting with \`use\` that compose other hooks — extract shared logic, not shared markup:

\`\`\`
function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
\`\`\``,
      quiz: [
        {
          q: "useEffect with [] runs…",
          options: ["After every render", "Once, after mount", "Never", "Before render"],
          answer: 1,
          explanation: "Empty deps = mount-only (plus unmount cleanup).",
        },
        {
          q: "The cleanup function returned by an effect runs…",
          options: [
            "Never",
            "Before the next effect run and on unmount",
            "Only on errors",
            "After unmount only",
          ],
          answer: 1,
          explanation:
            "Cleanup prevents leaks — unsubscribe before re-subscribing.",
        },
        {
          q: "useRef is for…",
          options: [
            "Re-rendering on change",
            "A mutable value/DOM handle that doesn't trigger renders",
            "Replacing useState everywhere",
            "Caching API calls",
          ],
          answer: 1,
          explanation:
            "Refs persist across renders silently — timers, previous values, DOM nodes.",
        },
        {
          q: "Which violates the rules of hooks?",
          options: [
            "Calling useState at the top of a component",
            "Calling useEffect inside an if block",
            "Calling two hooks in a row",
            "Using a custom hook",
          ],
          answer: 1,
          explanation:
            "Hooks must run in the same order every render — conditionals break the mapping.",
        },
        {
          q: "Choose useReducer over useState when…",
          options: [
            "You have one boolean",
            "State transitions are complex and multi-step",
            "You want faster renders",
            "Never — they're identical",
          ],
          answer: 1,
          explanation:
            "Reducers centralize transition logic as pure functions — testable and predictable.",
        },
      ],
    },
    {
      id: "react-styling-routing",
      title: "Tailwind, Routing & App Architecture",
      minutes: 11,
      reading: true,
      body: `**Tailwind CSS** is utility-first: no naming games, composition happens in markup.

\`\`\`
<button class="rounded-full bg-ink-950 px-6 py-2.5 font-semibold text-white hover:shadow-lg transition">
  Get started
</button>
\`\`\`

- Utilities map 1:1 to CSS properties (\`px-6\` = padding-x 24px, \`md:\` prefix = breakpoint).
- Extract repeated patterns into a component, not a CSS class — **reuse via React, not via class names**.
- Design tokens live in \`tailwind.config.js\` — that's your design system.

**Routing with React Router** maps URLs to components without a page reload:

\`\`\`
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/lessons/:id" element={<Lesson />} />
</Routes>

// in Lesson: read the URL
const { id } = useParams();
const navigate = useNavigate();
navigate("/lessons/2");
\`\`\`

**This app is a worked example** — look at its structure:
- \`App.tsx\` — routes only
- \`pages/\` — route-level screens
- \`components/\` — reusable pieces (Nav, Quiz, Playground)
- \`data/\` — curriculum as typed data, separate from UI
- \`lib/\` — pure logic (sandbox runner, progress)

**State management pattern ladder:** local \`useState\` first → lifted state for siblings → \`useContext\` for app-wide low-frequency values (theme, auth user) → a store (Zustand/Redux) only when context causes re-render pain. Most apps never need the last rung.`,
      quiz: [
        {
          q: "Tailwind's philosophy is…",
          options: [
            "Write CSS in separate files",
            "Compose styles from small utility classes in markup",
            "Inline style attributes",
            "No CSS at all",
          ],
          answer: 1,
          explanation:
            "Utilities like flex and px-4 compose in JSX; extraction happens at the component level.",
        },
        {
          q: "Repeated Tailwind patterns should be extracted as…",
          options: [
            "A CSS class with @apply everywhere",
            "A React component",
            "A utility function",
            "A media query",
          ],
          answer: 1,
          explanation:
            "Reuse lives in components — that's the Tailwind-recommended pattern.",
        },
        {
          q: "useParams() returns…",
          options: [
            "Component props",
            "Dynamic route segments like :id from the current URL",
            "Query strings only",
            "Form values",
          ],
          answer: 1,
          explanation: "It reads path parameters from the matched route.",
        },
        {
          q: "The recommended state management escalation is…",
          options: [
            "Redux first, always",
            "useState → lifted state → context → external store",
            "Context for everything",
            "localStorage only",
          ],
          answer: 1,
          explanation:
            "Start local; reach for heavier tools only when the simpler tier hurts.",
        },
        {
          q: "In this codebase, curriculum content lives in…",
          options: [
            "Component JSX",
            "src/data as typed data structures",
            "CSS files",
            "The URL",
          ],
          answer: 1,
          explanation:
            "Data/UI separation — pages render whatever tracks.ts contains.",
        },
      ],
    },
  ],
};
