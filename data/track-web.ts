import type { Track } from "./types";
import { debugChallenge } from "./debug-challenges";

export const webTrack: Track = {
  id: "web",
  title: "Web Development Foundations",
  blurb: "HTML5, CSS3, and modern JavaScript — the bedrock every frontend stands on.",
  numeral: "Ⅰ",
  lessons: [
    {
      id: "html-semantic",
      title: "Semantic HTML: Pages That Mean Something",
      minutes: 10,
      reading: true,
      body: `HTML isn't about making things *look* right — it's about saying what things **are**. Semantic elements tell browsers, search engines, and screen readers what role each region plays.

\`\`\`
<body>
  <header>    <!-- site banner, nav lives here -->
    <nav>…</nav>
  </header>
  <main>      <!-- one per page: the unique content -->
    <article> <!-- self-contained: a post, a card, a product -->
      <h1>Title</h1>
      <section> <!-- thematic grouping inside -->
        <h2>Sub-heading</h2>
      </section>
    </article>
    <aside>   <!-- tangential: related links, ads -->
    <footer>  <!-- meta info, copyright -->
  </main>
</body>
\`\`\`

**Why it matters:**
- **Accessibility** — screen readers navigate by landmarks. A page of \`<div>\`s is a maze; a semantic page is a building with signs.
- **SEO** — search engines weight content inside \`<article>\` and headings more heavily.
- **Maintainability** — \`<main>\` tells the next developer more than \`<div class="main-content">\` ever could.

**The rules of thumb:**
1. One \`<h1>\` per page, headings in order — never skip levels for styling (use CSS for that).
2. \`<main>\` appears once; \`<article>\` and \`<section>\` can nest.
3. A \`<div>\` is not a failure — use it when nothing semantic fits. Use \`<section>\` only when it has a heading.

**The box model** underpins every layout: \`margin\` (space outside) → \`border\` → \`padding\` (space inside) → \`content\`. \`box-sizing: border-box\` makes \`width\` include padding and border, which is what everyone wants — modern resets apply it globally.`,
      quiz: [
        {
          q: "Which element should appear exactly once per page?",
          options: ["<section>", "<article>", "<main>", "<div>"],
          answer: 2,
          explanation:
            "<main> wraps the unique primary content of the page — duplicates confuse landmarks.",
        },
        {
          q: "What does box-sizing: border-box do?",
          options: [
            "Adds a border to every box",
            "Makes width/height include padding and border",
            "Rounds all corners",
            "Centers the element",
          ],
          answer: 1,
          explanation:
            "With border-box, width includes padding + border, so boxes stay the size you asked for.",
        },
        {
          q: "Where does the primary page navigation belong?",
          options: ["<footer>", "<nav> inside <header>", "<aside>", "<main>"],
          answer: 1,
          explanation:
            "Site-level navigation is a landmark inside the banner — <nav> within <header>.",
        },
        {
          q: "Which is the RIGHT order of box model layers, outside to in?",
          options: [
            "content → padding → border → margin",
            "margin → border → padding → content",
            "padding → margin → content → border",
            "border → margin → padding → content",
          ],
          answer: 1,
          explanation:
            "From outside in: margin, border, padding, content.",
        },
        {
          q: "When is a <div> the right choice?",
          options: [
            "Never — always use semantic tags",
            "When no semantic element matches the content's meaning",
            "Only inside <footer>",
            "For every heading",
          ],
          answer: 1,
          explanation:
            "Divs are honest workhorses — use them when nothing more specific describes the content.",
        },
      ],
    },
    {
      id: "box-model-deep",
      title: "The Box Model, Margins & Collapsing",
      minutes: 9,
      sort: {
        prompt: "Order the box model layers from the outside in.",
        items: [
          "margin — space pushed away outside the border",
          "border — the visible edge of the box",
          "padding — space between the border and the content",
          "content — the text, image, or child elements",
        ],
        explanation:
          "From outside in: margin, border, padding, content. That is also the order browsers paint them, which is why margins collapse but padding never does.",
      },
      reading: true,
      body: `Every element is a **box of nested layers** — margin, border, padding, content — and layout bugs are usually box-model bugs.

\`\`\`
.card {
  width: 300px;
  padding: 20px;
  border: 2px solid;
  /* content-box: real width = 300 + 40 + 4 = 344px 😱 */
  box-sizing: border-box; /* real width = 300px ✓ */
}
\`\`\`

Modern resets make \`border-box\` the default — but know what the legacy behavior is, because you'll meet it in old code.

**Margin collapsing** surprises everyone: vertical margins between siblings **merge** into the larger one instead of adding. Two stacked cards with 20px margins sit 20px apart, not 40px.

\`\`\`
/* margins collapse here */
.card + .card { margin-top: 20px; }

/* they don't collapse across padding/border/flex/grid */
.stack { display: grid; gap: 20px; }
\`\`\`

**The collapse rules that matter:**
1. Adjacent siblings collapse (max wins)
2. Parent and first/last child collapse — unless the parent has padding/border between them
3. Flex/grid containers never collapse margins — one reason they're layout safe-havens
4. Horizontal margins never collapse

**Auto margins** center blocks: \`margin: 0 auto\` on a fixed-width element is the classic centering move.

Debug habit: in DevTools, the box-model diagram at the bottom of the Elements panel shows every layer's exact pixels — read it before you guess.`,
      quiz: [
        {
          q: "With box-sizing: content-box, a 300px-wide element with 20px padding and 2px border is really…",
          options: ["300px", "322px", "344px", "360px"],
          answer: 2,
          explanation: "300 + 40 (padding) + 4 (border) = 344px — the classic surprise.",
        },
        {
          q: "Two siblings with margin-bottom: 20px and margin-top: 30px sit apart by…",
          options: ["50px", "30px", "20px", "10px"],
          answer: 1,
          explanation: "Vertical margins collapse to the max — 30px.",
        },
        {
          q: "Which container never collapses child margins?",
          options: ["display: block", "display: flex", "display: inline", "display: table-row"],
          answer: 1,
          explanation: "Flex and grid establish new formatting contexts — no collapsing inside.",
        },
        {
          q: "margin: 0 auto centers an element when…",
          options: [
            "The element has a width and is block-level",
            "The element is inline",
            "Always, even full-width",
            "Only inside flex containers",
          ],
          answer: 0,
          explanation: "Auto margins eat free horizontal space — which requires a width to be free.",
        },
        {
          q: "The fastest way to see which layer ate your spacing?",
          options: [
            "Guess and add !important",
            "The box-model diagram in DevTools",
            "console.log the element",
            "Delete CSS until it looks right",
          ],
          answer: 1,
          explanation: "The diagram shows computed margin/border/padding/content pixel-exactly.",
        },
      ],
    },
    {
      id: "responsive-deep",
      title: "Responsive Design: Mobile-First in Practice",
      minutes: 10,
      reading: true,
      body: `Mobile-first isn't a style preference — it's a **constraint ordering**: design for the smallest viewport, then *add* complexity as space allows.

\`\`\`
/* base = mobile: single column, full width */
.layout { display: grid; gap: 16px; }

@media (min-width: 768px) {
  .layout { grid-template-columns: 240px 1fr; }
}
\`\`\`

**Why min-width beats max-width:** with min-width, base styles are the simple case and queries layer *on top*; with max-width you end up un-doing desktop styles for phones — fighting your own CSS.

**Fluid before breakpoints.** Breakpoints are the spice, not the meal:

\`\`\`
.hero-title { font-size: clamp(2rem, 5vw + 1rem, 4.5rem); }
.gallery { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
img, video { max-width: 100%; height: auto; }
\`\`\`

\`clamp(min, preferred, max)\` gives fluid typography with safety rails; \`auto-fill + minmax\` builds responsive grids with zero media queries.

**Real-device checklist:**
- Touch targets ≥ 44×44px — fingers, not cursors
- Viewport meta tag present: \`<meta name="viewport" content="width=device-width, initial-scale=1">\`
- Test with DevTools device emulation AND a real phone — emulation hides scroll/perf issues
- Respect \`prefers-reduced-motion\` for animations
- Don't disable zoom — accessibility failure

**Testing ritual:** resize continuously from 320px up; every breakage you find is a missing fluid rule or a breakpoint you actually need.`,
      quiz: [
        {
          q: "The core mobile-first technique is…",
          options: [
            "max-width queries shrinking desktop CSS",
            "Base styles for small screens, min-width queries adding complexity",
            "Separate mobile site on m.example.com",
            "Zooming out the desktop design",
          ],
          answer: 1,
          explanation: "Enhance upward instead of repairing downward.",
        },
        {
          q: "clamp(2rem, 5vw + 1rem, 4.5rem) does what?",
          options: [
            "Picks 5vw always",
            "Fluid size between 2rem and 4.5rem following viewport width",
            "Rounds to the nearest rem",
            "Sets minimum only",
          ],
          answer: 1,
          explanation: "Preferred value scales with vw, clamped to hard min/max rails.",
        },
        {
          q: "Minimum comfortable touch target size?",
          options: ["16×16px", "24×24px", "44×44px", "100×100px"],
          answer: 2,
          explanation: "Apple/Android guidelines converge around 44px for finger-sized targets.",
        },
        {
          q: "img, video { max-width: 100%; height: auto } prevents…",
          options: [
            "Slow loading",
            "Media overflowing its container on small screens",
            "Blurry images",
            "CORS errors",
          ],
          answer: 1,
          explanation: "The classic responsive-media rule — never wider than the box, aspect preserved.",
        },
        {
          q: "Why also test on a real phone?",
          options: [
            "DevTools emulation is perfect",
            "Emulation can't show real touch, scroll physics, or device performance",
            "Phones need special CSS files",
            "You don't need to",
          ],
          answer: 1,
          explanation: "Real devices surface touch latency, viewport quirks, and CPU limits emulation hides.",
        },
      ],
    },
    {
      id: "css-layout",
      title: "Flexbox, Grid & Responsive Strategy",
      minutes: 12,
      reading: true,
      sandbox: true,
      body: `Two layout systems, two mindsets:

**Flexbox** — one dimension at a time. Content flows along a main axis; great for toolbars, nav rows, centering.

\`\`\`
.toolbar {
  display: flex;
  justify-content: space-between; /* main axis */
  align-items: center;            /* cross axis */
  gap: 12px;
}
\`\`\`

**Grid** — two dimensions. You design the *structure* and place items into cells; great for page layouts and card walls.

\`\`\`
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
\`\`\`

That one \`grid-template-columns\` line is a whole responsive card wall — no media queries needed, because \`auto-fill\` + \`minmax\` decides how many columns fit.

**The decision rule:** choosing between flex and grid is about the *relationship* of items. Items adjusting to each other? Flex. Items aligning to a shared structure? Grid.

**Mobile-first media queries** — write the phone layout as the default, then enhance as space grows:

\`\`\`
.sidebar { width: 100%; }            /* base: mobile */

@media (min-width: 768px) {          /* tablet and up */
  .layout { display: grid; grid-template-columns: 240px 1fr; }
}
\`\`\`

Use \`min-width\` queries (not \`max-width\`), let content wrap naturally, and never test on one breakpoint — resize continuously.`,
      quiz: [
        {
          q: "Your items should flow in a row and shrink to fit. Best tool?",
          options: ["Grid", "Flexbox", "Floats", "Position absolute"],
          answer: 1,
          explanation:
            "One-dimensional content-driven flow is exactly what Flexbox was designed for.",
        },
        {
          q: "What does repeat(auto-fill, minmax(220px, 1fr)) achieve?",
          options: [
            "Exactly 220px columns always",
            "As many ≥220px columns as fit, sharing space equally",
            "One column on mobile",
            "It's invalid CSS",
          ],
          answer: 1,
          explanation:
            "auto-fill packs the row with the most ≥220px tracks that fit; 1fr distributes leftover space.",
        },
        {
          q: "justify-content aligns items along which axis?",
          options: ["Cross axis", "Main axis", "The z-axis", "The grid baseline"],
          answer: 1,
          explanation:
            "justify-* works on the main axis; align-* works on the cross axis.",
        },
        {
          q: "In mobile-first CSS, media queries should mostly use…",
          options: ["max-width", "min-width", "both equally", "no queries at all"],
          answer: 1,
          explanation:
            "min-width lets the base styles be mobile and layers on enhancements as space grows.",
        },
        {
          q: "Grid or Flexbox for a full-page app shell (sidebar + content + header)?",
          options: [
            "Flexbox — rows only",
            "Grid — it defines rows AND columns",
            "Neither; use tables",
            "Flexbox nested 10 deep",
          ],
          answer: 1,
          explanation:
            "Two-dimensional structure with named regions is Grid's home turf.",
        },
      ],
    },
    {
      id: "scope-context",
      title: "Execution Context & Scope: let, const, var",
      minutes: 10,
      body: `JavaScript runs your code in **execution contexts**. Each function call creates a new context with its own scope — a sandbox of visible variables.

\`\`\`
const global = "visible everywhere";

function outer() {
  const outerVar = "visible in outer";
  function inner() {
    console.log(global + " and " + outerVar); // closure!
  }
  inner();
}
\`\`\`

When \`inner\` runs, JavaScript walks up the **scope chain** until it finds each name. Functions remember where they were *born* — that's a **closure**, and it's how callbacks and hooks keep working after their parent finished.

**let vs const vs var:**

- \`var\` is function-scoped and **hoisted** (declared everywhere in the function, initialized to \`undefined\`) — a footgun. Modern code avoids it.
- \`let\` and \`const\` are block-scoped (\`{}\`-scoped) and sit in the "temporal dead zone" until their declaration line — the engine throws instead of quietly giving you \`undefined\`.
- Rule: **\`const\` by default, \`let\` when it must change, \`var\` never.**

\`\`\`
if (true) {
  let x = 1;
  const y = 2;
  var z = 3;      // leaks outside the block!
}
console.log(z);   // 3 — surprise
// console.log(x); // ReferenceError — contained
\`\`\``,
      starter: `function makeCounter() {
  let count = 0; // private — trapped in this closure
  return function increment() {
    count = count + 1;
    return count;
  };
}

const nextCount = makeCounter();
console.log(nextCount()); // 1
console.log(nextCount()); // 2
console.log(nextCount()); // 3

// TODO: fix the loop-scope bug — this prints 3, 3, 3
const printDelayed = [];
for (var i = 0; i < 3; i++) {
  printDelayed.push(() => i); // each callback reads the SAME var i
}
console.log(
  "loop captured:",
  printDelayed.map((capture) => capture()).join(",")
);`,
      check: {
        expr: "output.includes('1') && output.includes('3') && output.includes('loop captured: 0,1,2')",
        hint: "Keep the counter working, and change var i to let i so each iteration keeps its own value.",
      },
      predict: [
        {
          prompt: "What does this print — and why?",
          code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
          options: [
            "0, 1, 2 — each callback captures its own i",
            "3, 3, 3 — var is function-scoped, so all three closures share one i that ends at 3",
            "0, 1, 2, then 3",
            "Nothing — the loop finishes before setTimeout registers",
          ],
          answer: 1,
          explanation:
            "var has one binding for the whole function; by the time the timers fire, i is 3. Swap var for let and you get 0, 1, 2 — let creates a fresh binding per iteration.",
        },
        {
          prompt: "And what does this classic return?",
          code: `function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}
const c = makeCounter();
c();
c();
console.log(c());`,
          options: ["0", "1", "3", "undefined"],
          answer: 2,
          explanation:
            "The returned function closes over count, which stays alive between calls. Two calls already ran, so the third returns 3. That persistent private state is the whole power of closures.",
        },
      ],
      quiz: [
        {
          q: "What does the temporal dead zone mean?",
          options: [
            "let/const variables exist but throw if read before declaration",
            "Garbage collection pauses",
            "The event loop is blocked",
            "Old browsers crash",
          ],
          answer: 0,
          explanation:
            "Between scope entry and the declaration line, touching a let/const throws instead of returning undefined.",
        },
        {
          q: "A closure is…",
          options: [
            "A finished function",
            "A function remembering variables from where it was created",
            "A private class field",
            "The end of a loop",
          ],
          answer: 1,
          explanation:
            "Functions capture their birthplace's scope — that's why makeCounter's count survives.",
        },
        {
          q: "Which loop printed 3, 3, 3 in the old days, and why?",
          options: [
            "for with let — blocks share state",
            "for with var — one function-scoped variable",
            "while loops always do this",
            "It was a browser bug",
          ],
          answer: 1,
          explanation:
            "var is one shared binding; by the time callbacks run, i is 3. let creates a fresh binding per iteration.",
        },
        {
          q: "Default declaration choice in modern JS?",
          options: ["var", "let", "const", "whatever compiles"],
          answer: 2,
          explanation:
            "const by default communicates intent; switch to let only when reassignment is needed.",
        },
        {
          q: "Block scope means…",
          options: [
            "Variables live inside any { } block",
            "Variables live inside functions only",
            "Variables live on the window",
            "Variables live in modules",
          ],
          answer: 0,
          explanation:
            "let/const bind to the nearest enclosing block, not the whole function like var.",
        },
      ],
    },
    {
      id: "es6-syntax",
      title: "ES6+ Power Syntax: Arrows & Destructuring",
      minutes: 9,
      // Tier 3 conversion (V2 §9): the recall starter ("write destructuring
      // from memory") is gone. What the lesson now grades is the judgment
      // version — an AI refactor that changes semantics — while the arrow and
      // spread teaching stays in the reading above it.
      debug: debugChallenge("off-by-one"),
      body: `Modern JavaScript reads differently than the old tutorials. Two upgrades you'll use every single day:

**Arrow functions** — compact, and they *don't create their own \`this\`*:

\`\`\`
// old
const doubled = nums.map(function (n) { return n * 2; });

// modern
const doubled = nums.map((n) => n * 2);
\`\`\`

**Destructuring** — unpack in one step:

\`\`\`
const { name, level } = player;   // objects: by key
const [first, second] = pair;     // arrays: by position
const { id, ...rest } = payload;  // rest properties
\`\`\`

Combine them with default values and parameters:

\`\`\`
function renderUser({ name, role = "member" }) {
  console.log(name + " (" + role + ")");
}
\`\`\`

**The spread operator** (\`...\`) copies and merges without mutating — a habit that matters the moment you touch React:

\`\`\`
const updated = { ...state, score: state.score + 10 };
const merged = [...a, ...b];
\`\`\`

Below: refactoring practice from old-school to modern style.`,
      starter: `// Old-school above, modern syntax below. Finish both TODOs.
const users = [
  { name: "Ada", points: 90 },
  { name: "Lin", points: 75 },
  { name: "Sam", points: 55 },
];

const winners = users.filter(function (u) { return u.points >= 70; });
const names = [];
for (var i = 0; i < winners.length; i++) {
  names.push(winners[i].name);
}
console.log("winners:", names.join(", "));

// TODO 1: in ONE line — an arrow plus destructuring — log every winner, so
// this prints "Ada: 90" and "Lin: 75". Start from winners.forEach(...)

// TODO 2: boost a copy by 10 points. The last two lines must print 90 and 100,
// which means boosted has to be a COPY, not another name for state.
const state = { points: 90 };
const boosted = state;
boosted.points += 10;
console.log("state.points:", state.points);
console.log("boosted.points:", boosted.points);`,
      check: {
        expr: "output.includes('Ada: 90') && output.includes('Lin: 75') && output.includes('state.points: 90') && output.includes('boosted.points: 100')",
        hint: "winners.forEach(({ name, points }) => console.log(name + ': ' + points)); then const boosted = { ...state }; — spread makes an independent copy.",
      },
      predict: [
        {
          prompt: "What does this destructuring produce?",
          code: `const { name, tags: [first] } = { name: "ada", tags: ["eng", "ops"] };
console.log(name, first);`,
          options: [
            "ada [\"eng\", \"ops\"]",
            "ada eng",
            "undefined undefined",
            "It throws — you can't nest destructuring",
          ],
          answer: 1,
          explanation:
            "`tags: [first]` pulls the tags property AND destructures its first element. Nested destructuring reads one level deeper per bracket.",
        },
        {
          prompt: "What does this spread do?",
          code: `const base = { role: "member", admin: false };
const user = { ...base, admin: true };
console.log(user.role, user.admin);`,
          options: ["member false", "member true", "true true", "It mutates base"],
          answer: 1,
          explanation:
            "Later keys win: the spread copies base first, then admin: true overrides it. This 'defaults then overrides' pattern is everywhere in real code.",
        },
      ],
      quiz: [
        {
          q: "Arrow functions differ from regular functions because they…",
          options: [
            "Are always faster",
            "Don't create their own this binding",
            "Can't take parameters",
            "Return undefined",
          ],
          answer: 1,
          explanation:
            "Arrows inherit this from their surroundings — ideal for callbacks.",
        },
        {
          q: "const { a, b } = obj; is equivalent to…",
          options: [
            "const a = obj; const b = obj;",
            "const a = obj.a; const b = obj.b;",
            "const [a, b] = obj;",
            "Nothing — invalid syntax",
          ],
          answer: 1,
          explanation: "Object destructuring pulls properties by key.",
        },
        {
          q: "What does [...items, newItem] do?",
          options: [
            "Mutates items",
            "Creates a new array with newItem appended",
            "Throws if items is empty",
            "Flattens newItem",
          ],
          answer: 1,
          explanation:
            "Spread makes a shallow copy — the original stays untouched (immutability).",
        },
        {
          q: "function f({ x = 5 }) {} — when is the default used?",
          options: [
            "When x is 0",
            "When x is undefined (or missing)",
            "When x is null",
            "Always",
          ],
          answer: 1,
          explanation:
            "Defaults trigger on undefined only — 0 and null are real values.",
        },
        {
          q: "const { id, ...rest } = data; — what is rest?",
          options: [
            "A syntax error",
            "A new object with everything except id",
            "The value of id",
            "An array of keys",
          ],
          answer: 1,
          explanation:
            "Rest properties collect the leftovers into a fresh object.",
        },
      ],
    },
    {
      id: "dom-events",
      title: "DOM Traversal & Event Delegation",
      minutes: 11,
      reading: true,
      body: `The DOM is a tree you can walk:

\`\`\`
list.children            // direct children
item.parentElement       // walk up
item.closest(".card")    // nearest ancestor matching a selector
item.querySelector("p")  // search below
item.previousElementSibling
\`\`\`

**Events don't stop where you click.** They travel in two phases: **capture** (down from the document) then **bubble** (back up to the document). \`addEventListener(type, fn, { capture: true })\` chooses the downward trip; by default you get bubbling.

**Event delegation** exploits bubbling — attach ONE listener to a stable parent instead of many listeners on changing children:

\`\`\`
list.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;                       // click landed on the list itself
  console.log("clicked:", btn.dataset.action);
});
\`\`\`

Why this wins:
1. **Dynamically added items work instantly** — no re-binding after every render.
2. **100 list rows = 1 listener**, not 100.
3. **Removing elements can't leak listeners.**

Read \`event.target\` (what was actually hit) vs \`event.currentTarget\` (what the listener is attached to). And call \`event.preventDefault()\` to stop default behaviors — like a form actually submitting.`,
      predict: [
        {
          prompt: "This mini event system prints what? (Same idea as DOM listeners)",
          code: `const listeners = {};
function on(evt, fn) {
  (listeners[evt] ??= []).push(fn);
}
function emit(evt) {
  for (const fn of listeners[evt] ?? []) fn(evt);
}
on("click", (e) => console.log("A:", e));
on("click", (e) => console.log("B:", e));
emit("click");`,
          options: [
            "A: click only — the second on() replaces the first",
            "B: click then A: click — last registered fires first",
            "A: click then B: click — handlers fire in registration order",
            "Nothing — emit needs two arguments",
          ],
          answer: 2,
          explanation:
            "Each event maps to an ARRAY of listeners; emit walks it front to back. The DOM does exactly this — addEventListener appends, it never replaces (that's the old onclick model).",
        },
      ],
      quiz: [
        {
          q: "Event delegation means…",
          options: [
            "One listener on a parent handling clicks for its children",
            "Each element gets its own listener",
            "Delegating events to the server",
            "Using capture phase only",
          ],
          answer: 0,
          explanation:
            "You exploit bubbling: the parent hears child clicks and inspects event.target.",
        },
        {
          q: "Why does event.target.closest('button') matter in a delegated handler?",
          options: [
            "It's faster than addEventListener",
            "The click may land on a child inside the button, not the button itself",
            "It prevents bubbling",
            "It creates the button",
          ],
          answer: 1,
          explanation:
            "closest() walks up from the actual target to find the actionable ancestor.",
        },
        {
          q: "During bubbling, an event travels…",
          options: [
            "document → target",
            "target → document (up through ancestors)",
            "Nowhere — it's instant",
            "Only between siblings",
          ],
          answer: 1,
          explanation:
            "Capture goes down, bubble goes back up — bubbling is the upward phase.",
        },
        {
          q: "You add 50 <li> to a list with a delegated listener. How many new listeners do you add?",
          options: ["50", "1", "0", "51"],
          answer: 2,
          explanation:
            "Zero — the parent's existing listener already covers future children. That's the payoff.",
        },
        {
          q: "Which walks UP the tree to the nearest match?",
          options: [
            "el.querySelector('.x')",
            "el.closest('.x')",
            "el.children",
            "el.firstChild",
          ],
          answer: 1,
          explanation: "closest() searches ancestors; querySelector searches descendants.",
        },
      ],
    },
    {
      id: "async-promises",
      title: "Promises & async/await",
      minutes: 11,
      body: `Slow things (network, timers, files) can't block a single-threaded page. **Promises** are IOUs for future values.

\`\`\`
const p = fetch("/api/user");   // starts now, resolves later
p.then((res) => console.log("done", res));
console.log("this runs FIRST"); // sync code never waits
\`\`\`

A promise is **pending** → then either **fulfilled** (\`.then\` runs) or **rejected** (\`.catch\` runs).

**async/await** is promise syntax that *reads* like synchronous code:

\`\`\`
async function loadUser() {
  try {
    const res = await fetch("/api/user");
    const data = await res.json();   // res.json() is ALSO a promise
    return data;
  } catch (err) {
    console.error("failed:", err);
  }
}
\`\`\`

**Rules that trip everyone up:**
1. \`await\` only works inside \`async\` functions (and top-level in modules).
2. \`await\` pauses *that function*, not the whole page — the event loop keeps spinning.
3. Sequential awaits = total of both times. Independent work? Run it in parallel:

\`\`\`
const [user, posts] = await Promise.all([getUser(), getPosts()]);
\`\`\`

Try the playground — \`sleep()\` is a promise-based timer, so you can watch async ordering with zero network.`,
      starter: `// sleep(ms) returns a promise — a stand-in for real I/O
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function brewTea() {
  console.log("1. kettle on");
  await sleep(100);
  console.log("2. water boiled");
  await sleep(100);
  console.log("3. tea steeped");
  return "🍵 ready";
}

console.log("0. order placed");
brewTea().then((result) => console.log("4.", result));
console.log("5. (still free to do other work!)");

// TODO: run two brews in PARALLEL with Promise.all
// and log how the total wait is one brew, not two
async function main() {
  const first = await brewTea();
  const second = await brewTea();
  console.log("batch done:", first + " + " + second);
}
main();`,
      check: {
        expr: "output.includes('order placed') && output.includes('batch done') && output.indexOf('2. water boiled') > output.lastIndexOf('1. kettle on')",
        hint: "Both brews must be in flight at once: with Promise.all the second '1. kettle on' still lands before the first '2. water boiled'. Awaiting them one after the other serialises the waits — the second brew only starts once the first is finished.",
      },
      predict: [
        {
          prompt: "In what order do these log?",
          code: `console.log("start");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("end");`,
          options: [
            "start, timeout, promise, end",
            "start, end, promise, timeout — sync first, then microtasks (promises), then macrotasks (timers)",
            "start, end, timeout, promise",
            "start, promise, end, timeout",
          ],
          answer: 1,
          explanation:
            "After the sync stack drains, the event loop empties ALL microtasks (promise callbacks) before touching the timer queue. setTimeout(0) is never 'immediate'.",
        },
        {
          prompt: "What does this chain print?",
          code: `Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { console.log(v); return v * 2; })
  .then((v) => console.log(v));`,
          options: [
            "1 then 2",
            "2 then 4 — each .then transforms the previous return value",
            "2 then 2",
            "undefined then undefined",
          ],
          answer: 1,
          explanation:
            "Values flow through the chain: 1 becomes 2, gets logged, becomes 4, gets logged. Whatever a .then callback returns is handed to the next one — that's the chaining model.",
        },
      ],
      quiz: [
        {
          q: "await can be used…",
          options: [
            "Anywhere in JavaScript",
            "Inside async functions (or top-level in modules)",
            "Only in event handlers",
            "Only with setTimeout",
          ],
          answer: 1,
          explanation:
            "await is gated to async function bodies (plus top-level await in modules).",
        },
        {
          q: "While awaiting, the browser…",
          options: [
            "Freezes completely",
            "Keeps running the event loop — other code proceeds",
            "Reloads the page",
            "Blocks all promises",
          ],
          answer: 1,
          explanation:
            "Only the current async function suspends; the page stays responsive.",
        },
        {
          q: "res.json() returns…",
          options: ["A plain object", "A promise that resolves to parsed JSON", "A string", "undefined"],
          answer: 1,
          explanation:
            "Body parsing is async — that's why you await it twice (fetch, then json).",
        },
        {
          q: "Two independent fetches: fastest pattern?",
          options: [
            "await a; await b;",
            "Promise.all([a, b]) awaited once",
            "Call them and never await",
            "await a.then(b)",
          ],
          answer: 1,
          explanation:
            "Promise.all runs them concurrently — total time ≈ the slower one, not the sum.",
        },
        {
          q: "A rejected promise with no .catch becomes…",
          options: ["undefined", "An unhandled rejection error", "A retry", "null"],
          answer: 1,
          explanation:
            "Always attach .catch or wrap in try/catch — silent failures are the worst failures.",
        },
      ],
    },
    {
      id: "fetch-api",
      title: "Fetching Real APIs (with a Mock Server)",
      minutes: 12,
      body: `The **Fetch API** is how the browser talks to servers:

\`\`\`
const res = await fetch("https://api.example.com/users");
if (!res.ok) throw new Error("HTTP " + res.status);  // fetch doesn't throw on 404s!
const data = await res.json();                       // body → JS object
\`\`\`

**The two awaits** confuse everyone: \`fetch\` resolves when *headers* arrive; \`res.json()\` resolves when the *body* finishes streaming.

**Status codes are the conversation:**
- \`200\` OK · \`201\` Created · \`204\` No Content
- \`400\` Bad Request (your fault) · \`401\` Unauthorized · \`404\` Not Found
- \`500\`, \`502\`, \`503\` — server's problem

**Passing options:**

\`\`\`
await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Ada" }),
});
\`\`\`

This sandbox has a **mock server** with real latency: \`GET /api/users\`, \`GET /api/users/:id\`, \`POST /api/users\`, \`DELETE /api/users/:id\`, and a flaky \`GET /api/flaky\` that fails randomly — perfect for practicing error handling.`,
      starter: `// A mock server lives in this sandbox. Try the CRUD cycle:

async function main() {
  // READ all
  let res = await fetch("/api/users");
  let users = await res.json();
  console.log("users:", users.map((u) => u.name).join(", "));

  // CREATE
  res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Grace", role: "admiral" }),
  });
  const created = await res.json();
  console.log("created:", created.name, "id", created.id, "status", res.status);

  // READ one
  res = await fetch("/api/users/" + created.id);
  const one = await res.json();
  console.log("fetched one:", one.name);

  // DELETE
  res = await fetch("/api/users/" + created.id, { method: "DELETE" });
  console.log("deleted, status:", res.status);

  // ERROR HANDLING — this one fails ~50% of the time
  try {
    res = await fetch("/api/flaky");
    if (!res.ok) throw new Error("HTTP " + res.status);
    console.log("flaky succeeded on this attempt!");
  } catch (err) {
    console.log("caught the failure:", err.message);
  }
}
main();`,
      check: {
        expr: "output.includes('created:') && (output.includes('flaky succeeded') || output.includes('caught the failure'))",
        hint: "Complete the CRUD cycle and make sure the flaky call is wrapped in try/catch so one of the two final lines always appears.",
      },
      quiz: [
        {
          q: "fetch() rejects its promise when…",
          options: [
            "The server returns 404",
            "The network itself fails — not on HTTP error statuses",
            "The JSON is invalid",
            "A header is missing",
          ],
          answer: 1,
          explanation:
            "HTTP 4xx/5xx still 'succeeds' as a response — check res.ok or res.status yourself.",
        },
        {
          q: "Why two awaits — fetch() then res.json()?",
          options: [
            "Style preference",
            "Headers arrive first; the body streams in separately",
            "json() is synchronous",
            "It's a browser bug",
          ],
          answer: 1,
          explanation:
            "fetch resolves on headers; res.json() resolves once the full body is parsed.",
        },
        {
          q: "Which status means 'you created something'?",
          options: ["200", "201", "301", "404"],
          answer: 1,
          explanation: "201 Created is the REST convention for successful POSTs.",
        },
        {
          q: "What must you do before sending an object in a POST body?",
          options: [
            "JSON.stringify it and set Content-Type: application/json",
            "Base64 encode it",
            "Nothing — objects send directly",
            "Wrap it in a form",
          ],
          answer: 0,
          explanation:
            "Bodies travel as strings — serialize, and declare the content type.",
        },
        {
          q: "A 500-series status means…",
          options: [
            "Your request was bad",
            "The server failed to handle a valid request",
            "You're not logged in",
            "The resource moved",
          ],
          answer: 1,
          explanation:
            "5xx = server-side failure; 4xx = client-side problem.",
        },
      ],
    },
    {
      id: "capstone-utility-belt",
      title: "Capstone: Build Your Utility Belt",
      minutes: 25,
      body: `Everything from this track in one build. You'll write a small **utility library** — the kind of functions real codebases keep in a \`utils/\` folder — with tests baked into the exercise.

**What you're building, function by function:**

\`\`\`
formatMoney(1234.5)        // "1,234.50"      — grouping + always 2 decimals
camelToTitle("firstName") // "First Name"     — split camelCase into words
chunk([1,2,3,4,5], 2)     // [[1,2],[3,4],[5]] — batch arrays into groups
debounceFlag(logs, 300)   // drops logs within 300ms of the previous one
uniqueBy(users, "role")   // first user per role — dedupe by a key
\`\`\`

**Approach that works:** implement ONE function, run, compare against the expected output in the comments, then move on. Don't write all five and start debugging — that's how bugs hide in teams.

**Hints, in increasing spoiler level:**
- \`formatMoney\`: \`toFixed(2)\` handles decimals; \`Intl.NumberFormat\` does grouping in one line
- \`camelToTitle\`: \`replace(/[A-Z]/g, ...)\` or split on the regex /(?=[A-Z])/ — mind the first word
- \`chunk\`: slice doesn't modify the array; the last chunk may be short
- \`debounceFlag\`: track the timestamp of the last KEPT entry
- \`uniqueBy\`: a \`Map\` keyed by the property, keep first-wins

This is a real portfolio piece: five tested utilities is a genuinely useful thing to have written once, by hand.`,
      starter: `// ─── 1 · formatMoney(1234.5) → "1,234.50" ───────────
function formatMoney(n) {
  // your code
  return n;
}
console.log("formatMoney:", formatMoney(1234.5));      // 1,234.50
console.log("formatMoney:", formatMoney(7));           // 7.00
console.log("formatMoney:", formatMoney(1234567.891)); // 1,234,567.89

// ─── 2 · camelToTitle("firstName") → "First Name" ───
function camelToTitle(s) {
  // your code
  return s;
}
console.log("camelToTitle:", camelToTitle("firstName"));    // First Name
console.log("camelToTitle:", camelToTitle("numberOfUsers")); // Number Of Users

// ─── 3 · chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]] ──
function chunk(arr, size) {
  // your code
  return [];
}
console.log("chunk:", JSON.stringify(chunk([1, 2, 3, 4, 5], 2)));   // [[1,2],[3,4],[5]]
console.log("chunk:", JSON.stringify(chunk(["a", "b", "c"], 3)));   // [["a","b","c"]]

// ─── 4 · debounceFlag: keep only logs ≥300ms after the last kept ─
function debounceFlag(logs, gap) {
  // logs: { time, msg }[] sorted by time — return the kept ones
  return [];
}
const logs = [
  { time: 0, msg: "click" },
  { time: 100, msg: "click" },   // within 300 of kept → dropped
  { time: 500, msg: "click" },   // kept
  { time: 600, msg: "click" },   // dropped
];
console.log("debounceFlag times:", debounceFlag(logs, 300).map((l) => l.time).join(",")); // 0,500

// ─── 5 · uniqueBy: first item per key value ─────────
function uniqueBy(items, key) {
  // your code
  return [];
}
const users = [
  { name: "Ada", role: "eng" }, { name: "Lin", role: "design" },
  { name: "Sam", role: "eng" }, { name: "Rey", role: "ops" },
];console.log("uniqueBy:", uniqueBy(users, "role").map((u) => u.name).join(",")); // Ada,Lin,Rey

// TODO: all 9 outputs must match the comments on the right`,
      check: {
        expr:
          "output.includes('1,234.50') && output.includes('7.00') && output.includes('1,234,567.89') && output.includes('First Name') && output.includes('Number Of Users') && output.includes('[[1,2],[3,4],[5]]') && output.includes('debounceFlag times: 0,500') && output.includes('Ada,Lin,Rey')",
        hint: "formatMoney: n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }). camelToTitle: s.replace(/([A-Z])/g, ' $1') then fix the first word's casing. chunk: loop i += size and arr.slice(i, i + size). debounceFlag: keep if log.time - lastKept.time >= gap. uniqueBy: new Map keyed by item[key] — set only if absent.",
      },
      quiz: [
        {
          q: "In formatMoney, toFixed(2) alone fails because…",
          options: [
            "It rounds wrong",
            "It adds no thousands separators",
            "It returns a number",
            "It only works on integers",
          ],
          answer: 1,
          explanation:
            "toFixed handles decimals but not grouping — toLocaleString or Intl.NumberFormat do both.",
        },
        {
          q: "chunk([1,2,3,4,5], 2) — the last chunk has 1 element because…",
          options: [
            "slice throws on out-of-range ends",
            "slice just returns fewer items when the end overshoots",
            "The loop rounds down",
            "chunk always drops remainders",
          ],
          answer: 1,
          explanation:
            "arr.slice(4, 6) on 5 items returns [arr[4]] — slice clamps, it never throws.",
        },
        {
          q: "debounceFlag is O(n) because…",
          options: [
            "It uses a Map",
            "One pass, tracking the last kept timestamp — no rescanning",
            "It sorts first",
            "It's actually O(n²)",
          ],
          answer: 1,
          explanation:
            "Each log is compared to the last KEPT one exactly once — constant work per item.",
        },
        {
          q: "uniqueBy 'first wins' requires…",
          options: [
            "Sorting before deduping",
            "Only setting the map entry when the key isn't there yet",
            "Reversing the array",
            "A Set of names",
          ],
          answer: 1,
          explanation:
            "map.has(key) ? skip : map.set(key, item) — order of checks decides which item survives.",
        },
        {
          q: "The implement-one-then-run discipline prevents…",
          options: [
            "Syntax errors",
            "Bugs piling up in unknown layers — each failure stays local to one function",
            "The need for tests",
            "Slow execution",
          ],
          answer: 1,
          explanation:
            "Five untested functions failing at once gives you five suspects per symptom. Small loops localize failures.",
        },
      ],
    },
  ],
};
