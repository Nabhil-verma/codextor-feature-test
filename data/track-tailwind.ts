import type { Track } from "./types";

export const tailwindTrack: Track = {
  id: "tailwind",
  title: "UI Engineering with Tailwind CSS",
  blurb:
    "Utility-first styling, responsive systems, and shipping a real component kit.",
  numeral: "Ⅺ",
  optional: true,
  optionalWhy:
    "Framework-specific styling. The mental model transfers to any utility-first system, but the utilities themselves are Tailwind's — worth the six lessons if your target stack uses it.",
  lessons: [
    {
      id: "utility-first",
      title: "Utility-First: The Mental Model",
      minutes: 11,
      preview: {
        brief:
          "The card shell is there but empty. Add the content and style the button — the preview re-renders live as you type.",
        goal:
          "Inside .panel add an h1, a p, and a button. Give the button the classes rounded-full, bg-ink-950, px-5 and text-white.",
        html: `<main class="min-h-screen bg-slate-100 p-8">
  <div class="panel mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-lg">
    <!-- add an h1, a p, and a styled button here -->
  </div>
</main>`,
        requires: [
          ".panel h1",
          ".panel p",
          "button.rounded-full",
          "button.bg-ink-950",
        ],
      },
      body: `**Tailwind doesn't replace CSS — it removes naming.** You still think in box model, flexbox and specificity; you just express the answer in the markup instead of inventing \`.card__title--large\` and then hunting for where it's overridden.

\`\`\`
<button class="rounded-full bg-ink-950 px-5 py-2 font-semibold text-white hover:bg-ink-800">
  Start learning
</button>
\`\`\`

Read that as CSS and it's transparent: a pill, near-black fill, 20px horizontal padding, semibold white text, lighter on hover. **Nothing is hidden behind a name.**

**The spacing scale is the real win.** Utilities aren't arbitrary pixels — they're a fixed ladder, and that ladder is what makes a UI look designed rather than assembled:

\`\`\`
p-1 = 4px    p-4 = 16px    p-8  = 32px
p-2 = 8px    p-6 = 24px    p-12 = 48px
\`\`\`

When every margin comes from one ladder, spacing is consistent by construction. Hand-written CSS drifts to \`padding: 13px\` and nobody notices until the page feels subtly wrong.

**Utility-first is not "no components."** You *should* extract a \`<Button>\` component — but you extract it in the language that already works (JS/JSX), not by inventing a CSS abstraction layer first.

**The honest trade-off:** markup gets longer. That's the price of removing the indirection, and it's why utilities pair so well with component frameworks. Repeated *identical* strings are the signal that a component is overdue.`,
      quiz: [
        {
          q: "What does utility-first styling actually remove?",
          options: [
            "The need to know CSS",
            "The naming and indirection layer between markup and styles",
            "The browser's stylesheet",
            "Responsive design",
          ],
          answer: 1,
          explanation:
            "You still need CSS mental models — you stop inventing class names and jumping between two files.",
        },
        {
          q: "In Tailwind's default scale, `p-4` is…",
          options: ["4px", "16px", "40px", "0.4rem"],
          answer: 1,
          explanation:
            "The scale is 0.25rem (4px) per step, so p-4 = 4 × 4px = 16px. Ratios stay consistent by design.",
        },
        {
          q: "When should you extract a component?",
          options: [
            "Never — utilities are enough",
            "As soon as the same utility string is repeated, or the markup has a clear identity",
            "Only when a designer asks",
            "After the project ends",
          ],
          answer: 1,
          explanation:
            "Repetition is the signal. You extract in JSX, keeping utilities as the styling vocabulary inside the component.",
        },
        {
          q: "Why is a constrained spacing scale better than free-form pixels?",
          options: [
            "It renders faster",
            "Consistent rhythm comes out automatically instead of drifting value by value",
            "It reduces CSS file size",
            "Browsers only support those values",
          ],
          answer: 1,
          explanation:
            "A shared ladder keeps vertical rhythm coherent — hand-picked values drift and the layout stops feeling intentional.",
        },
      ],
    },
    {
      id: "layout-flex-grid",
      title: "Layout: Flexbox & Grid in Utilities",
      minutes: 12,
      preview: {
        brief:
          "Turn the plain stack of cards into a responsive grid: one column on phones, three from the md breakpoint up.",
        goal:
          "Give .grid the classes grid, gap-6 and md:grid-cols-3, and make sure it contains three .card children.",
        html: `<main class="min-h-screen bg-slate-100 p-8">
  <div class="grid mx-auto max-w-4xl">
    <article class="card rounded-xl bg-white p-6 shadow">
      <h2 class="font-semibold">Components</h2>
      <p class="text-slate-600">Reusable pieces of UI.</p>
    </article>
    <article class="card rounded-xl bg-white p-6 shadow">
      <h2 class="font-semibold">Hooks</h2>
      <p class="text-slate-600">State and side effects.</p>
    </article>
    <article class="card rounded-xl bg-white p-6 shadow">
      <h2 class="font-semibold">Routing</h2>
      <p class="text-slate-600">URLs that map to views.</p>
    </article>
  </div>
</main>`,
        requires: [".grid.md\\:grid-cols-3", ".grid.gap-6", ".grid .card"],
      },
      body: `Two layout systems cover nearly every interface you'll build.

**Flexbox — one dimension.** Reach for it when children flow in a **row or a column** and you care about alignment and distribution:

\`\`\`
<header class="flex items-center justify-between gap-4">
  <a href="/">Logo</a>
  <nav class="flex items-center gap-6">…</nav>
</header>
\`\`\`

The vocabulary maps directly: \`flex\` → *become a flex container*, \`flex-col\` → *direction: column*, \`items-center\` → cross-axis centering, \`justify-between\` → push apart, \`gap-4\` → space between children.

**Use \`gap\`, not margins on children.** \`gap\` only applies *between* items, so it never leaves a stray margin at the start or end. That single habit removes most of the "why is there extra space on the left" bugs.

**Grid — two dimensions.** Reach for it when items sit in **rows and columns**:

\`\`\`
<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  …cards…
</div>
\`\`\`

\`grid-cols-3\` declares three equal tracks; \`gap-6\` spaces both axes at once. The **auto-fit** pattern makes a grid that responds without media queries — each column claims at least 16rem and the browser fits as many as it can:

\`\`\`
<div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6">
\`\`\`

**Which one?** Content in a row → flex. A layout of panels → grid. Toolbars, nav bars, button groups, and "icon next to label" are flex. Dashboards, galleries, and page scaffolding are grid. Both accept \`gap\`; neither needs a wrapper div to create space.`,
      quiz: [
        {
          q: "You need an icon centered next to a label inside a button. Which?",
          options: [
            "Flexbox — one-dimensional row with centered alignment",
            "Grid — always use grid for alignment",
            "Absolute positioning",
            "A table",
          ],
          answer: 0,
          explanation:
            "A single row with cross-axis centering is exactly what flex is for: `flex items-center gap-2`.",
        },
        {
          q: "Why prefer `gap` over margins on children?",
          options: [
            "It's shorter to type",
            "It only spaces items apart, so no stray leading/trailing margin appears",
            "Margins are deprecated",
            "gap animates better",
          ],
          answer: 1,
          explanation:
            "gap applies between items only — the classic `:last-child { margin-right: 0 }` cleanup disappears.",
        },
        {
          q: "`md:grid-cols-3` means…",
          options: [
            "Always three columns",
            "Three columns from the md breakpoint upward, mobile-first",
            "Three columns only on medium screens exactly",
            "A 3px gap",
          ],
          answer: 1,
          explanation:
            "Unprefixed utilities are the mobile baseline; `md:` overrides at that width and above, not just at it.",
        },
        {
          q: "Which declares a three-column layout?",
          options: ["grid-cols-3", "grid-3", "columns-3-grid", "flex-3"],
          answer: 0,
          explanation:
            "`grid-cols-3` sets three equal tracks on a grid container.",
        },
      ],
    },
    {
      id: "responsive-dark",
      title: "Responsive & Dark Mode Systems",
      minutes: 11,
      sort: {
        prompt:
          "A mobile-first layout is written once. Order the Tailwind utilities by the screen width at which each starts applying.",
        items: [
          "grid-cols-1        (no prefix)",
          "sm:grid-cols-2     (≥ 640px)",
          "md:grid-cols-3     (≥ 768px)",
          "lg:grid-cols-4     (≥ 1024px)",
          "2xl:grid-cols-6    (≥ 1536px)",
        ],
        explanation:
          "Unprefixed wins the base case, then each min-width prefix overrides the one before it as the viewport grows. Write the small screen first and let larger screens add on top.",
      },
      reading: true,
      body: `**Mobile-first is a writing order, not an opinion about phones.** Write the base case with no prefix, then add prefixed overrides that only kick in at wider viewports:

\`\`\`
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
\`\`\`

Tailwind's breakpoints are **min-width**, so each prefix means "from this width *and up*":

| Prefix | Min width |
| --- | --- |
| \`sm:\` | 640px |
| \`md:\` | 768px |
| \`lg:\` | 1024px |
| \`xl:\` | 1280px |
| \`2xl:\` | 1536px |

That's why unprefixed classes win on small screens: there is no \`max-width\` cascade to fight.

**Dark mode** is the same idea for colour. \`dark:\` activates when a \`.dark\` class sits on an ancestor (class strategy) — which is exactly how you build a toggle: flip one class on \`<html>\` and every \`dark:\` utility in the tree responds.

\`\`\`
<div class="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
\`\`\`

**State variants compose with everything.** \`hover:\`, \`focus-visible:\`, \`active:\`, \`disabled:\`, \`group-hover:\` and \`peer-checked:\` are prefixes too — and you can stack them with breakpoints:

\`\`\`
<button class="hover:bg-slate-800 md:hover:scale-105 dark:hover:bg-slate-700">
\`\`\`

**Design the interaction states explicitly.** A button needs a resting, hover, focus and disabled treatment or it will feel unfinished the moment someone tabs to it. \`focus-visible:ring-2\` is the accessible default: it shows a ring for keyboard users without annoying mouse users.

**Always style focus.** Removing the outline without a replacement makes a site unusable with a keyboard — and it's the accessibility failure that ships most often.`,
      quiz: [
        {
          q: "Tailwind's breakpoint prefixes are…",
          options: [
            "max-width — they apply below the size",
            "min-width — they apply from that size upward",
            "Exact-width only",
            "Device-detected",
          ],
          answer: 1,
          explanation:
            "Min-width is what makes mobile-first work: base styles apply everywhere, prefixed ones add on as space grows.",
        },
        {
          q: "`dark:` utilities activate when…",
          options: [
            "The OS is dark, always",
            "A configured class/env condition matches — e.g. `.dark` on an ancestor",
            "The user reloads",
            "CSS variables change",
          ],
          answer: 1,
          explanation:
            "With the class strategy, one `.dark` class on <html> switches every dark: utility in the tree — and makes a toggle trivial.",
        },
        {
          q: "Can you combine a breakpoint and a state variant?",
          options: [
            "No, one prefix per utility",
            "Yes — e.g. `md:hover:bg-slate-800`",
            "Only for hover",
            "Only in the config file",
          ],
          answer: 1,
          explanation:
            "Prefixes stack; the utility applies only when every condition holds.",
        },
        {
          q: "Why is `focus-visible:ring-2` better than removing the outline?",
          options: [
            "It looks nicer in screenshots",
            "Keyboard users can still see where they are — outline removal alone breaks navigation",
            "It's faster",
            "It disables the outline",
          ],
          answer: 1,
          explanation:
            "Removing focus styling without a replacement is the most common accessibility regression. focus-visible gives keyboard users a clear target without penalising mouse users.",
        },
      ],
    },
    {
      id: "states-motion",
      title: "States, Variants & Motion",
      minutes: 12,
      preview: {
        brief:
          "Build a card that reacts: lift on hover, ring on keyboard focus, and a group-hover accent on the title.",
        goal:
          "Give .card the classes hover:shadow-xl and focus-visible:ring-2, plus a tabindex so it can actually receive focus. Mark the h2 with group-hover:text-indigo-600.",
        html: `<main class="min-h-screen bg-slate-100 p-10">
  <div class="group card mx-auto max-w-sm rounded-2xl bg-white p-6 shadow transition">
    <h2 class="font-semibold text-slate-900">Keyboard first</h2>
    <p class="mt-1 text-slate-600">Hover me, then tab to me.</p>
  </div>
</main>`,
        // Graded on class presence, not live state: `:focus-visible` only
        // matches while the element is actually focused, which would make the
        // probe depend on the learner's cursor position.
        requires: [
          ".card.hover\\:shadow-xl",
          ".card[tabindex]",
          ".card.focus-visible\\:ring-2",
          "h2.group-hover\\:text-indigo-600",
        ],
      },
      body: `A static layout is only half a UI. The other half is what happens when the user **touches it**.

**State variants are prefixes.** \`hover:\`, \`focus:\`, \`focus-visible:\`, \`active:\`, \`disabled:\`, \`checked:\`, \`open:\` — each one compiles to a real CSS pseudo-class:

\`\`\`
<button class="rounded-lg bg-slate-900 px-4 py-2 text-white
               transition
               hover:bg-slate-700
               active:scale-95
               focus-visible:ring-2 focus-visible:ring-offset-2
               disabled:cursor-not-allowed disabled:opacity-50">
\`\`\`

That single element now has five deliberate states. Most "unfinished-feeling" UI is just missing states, not missing beauty.

**\`group\` and \`peer\` style a parent (or sibling) based on a child's state.** Mark the wrapper \`group\`, then react to it anywhere inside:

\`\`\`
<div class="group rounded-xl border p-5 transition hover:shadow-lg">
  <h3 class="transition group-hover:text-indigo-600">Title lifts too</h3>
</div>
\`\`\`

\`peer\` is the sibling version — a \`peer\` class on an input plus \`peer-checked:\` on a following label is a complete custom checkbox with no JavaScript.

**Motion should be fast and physical.** \`transition\` animates common properties; be explicit when it matters, and keep durations in the 150–300ms band:

\`\`\`
<button class="transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0">
\`\`\`

**Respect reduced motion.** Some users get motion sickness; \`motion-reduce:\` opts individual effects out:

\`\`\`
<div class="hover:scale-105 motion-reduce:hover:scale-100">
\`\`\`

One rule above all: **animate \`transform\` and \`opacity\`, not \`width\`/\`top\`/\`margin\`.** Transform and opacity are composited on the GPU; animating layout properties forces the browser to re-layout every frame and that's where jank comes from.`,
      quiz: [
        {
          q: "`group-hover:` lets you…",
          options: [
            "Style a child based on the parent's hover state",
            "Style the parent when a child is hovered",
            "Group many animations",
            "Style only the first child",
          ],
          answer: 0,
          explanation:
            "Tag the wrapper `group`, then any descendant can react to it — perfect for cards whose title or icon reacts to a whole-card hover.",
        },
        {
          q: "`peer-checked:` is most useful for…",
          options: [
            "Animating loops",
            "Styling a sibling based on an input's state — e.g. a custom checkbox label",
            "Centering content",
            "Responsive grids",
          ],
          answer: 1,
          explanation:
            "peer targets the previous sibling; combined with peer-checked you get interactive controls with zero JS.",
        },
        {
          q: "Which properties should you animate for smooth 60fps?",
          options: [
            "width and height",
            "transform and opacity",
            "margin and top",
            "font-size",
          ],
          answer: 1,
          explanation:
            "transform/opacity skip layout and paint — the browser composites them on the GPU. Animating layout properties causes per-frame reflow.",
        },
        {
          q: "Why add `motion-reduce:` variants?",
          options: [
            "Smaller bundle",
            "Users who set reduce-motion in their OS get the effect suppressed — it can cause real discomfort",
            "Required by Tailwind",
            "Better SEO",
          ],
          answer: 1,
          explanation:
            "Honouring prefers-reduced-motion is a genuine accessibility requirement, and Tailwind makes it a one-prefix change.",
        },
      ],
    },
    {
      id: "design-tokens",
      title: "Tokens, Theme Config & Custom Scales",
      minutes: 11,
      reading: true,
      body: `Utilities are values with names. When the values are *yours*, you extend the theme so the vocabulary matches your product — this very app does exactly that:

\`\`\`js
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        paper: { 50: "#ffffff", 100: "#f4f1ea", 200: "#e9e4d8", 300: "#d9d2c0" },
        ink:   { 950: "#0b0b0c", 900: "#131316", 800: "#242429", 700: "#2e2e35" },
        gold:  { 300: "#ecd9a0", 400: "#d4af37", 500: "#b8912e", 600: "#94721f" },
      },
      boxShadow: {
        glow: "0 0 22px rgba(212, 175, 55, 0.18)",
        lift: "0 1px 2px rgba(28,25,23,.05), 0 8px 24px rgba(28,25,23,.06)",
      },
    },
  },
};
\`\`\`

That produces a real design language: \`bg-paper-100\` for surfaces, \`text-ink-950\` for body copy, \`text-gold-400\` for accents, \`font-display\` for headings, \`shadow-glow\` for focus. A new developer reads the classes and learns the system.

**\`extend\` vs. replacing.** Inside \`theme.extend\` you *add* to the defaults (so \`text-red-500\` still works). Writing \`theme.colors = {…}\` **replaces** the palette — a small team-wide footgun. Extend unless you have a deliberate reason.

**Arbitrary values escape hatch.** \`[]\` handles the one-off without polluting the config:

\`\`\`
<div class="grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] top-[7px]">
\`\`\`

**The rule that keeps a codebase healthy: a value used twice stops being arbitrary.** One-off → \`[]\`. Repeated in three places → promote it into \`theme.extend\`. Otherwise arbitrary values quietly become a second, undocumented design system.

**\`@apply\` is a last resort.** It inlines utilities into a CSS class, which reintroduces the naming layer Tailwind removed and makes the styles invisible from the markup. Legitimate uses: styling content you don't control, like markdown output or a third-party widget. Everywhere else, use a component.`,
      quiz: [
        {
          q: "`theme.extend` vs `theme.colors = {…}`?",
          options: [
            "Identical",
            "extend adds to the defaults; assigning replaces the whole scale",
            "extend is faster",
            "Assigning is required",
          ],
          answer: 1,
          explanation:
            "Replacing drops every default colour — a classic surprise when bg-red-500 suddenly doesn't exist.",
        },
        {
          q: "When is an arbitrary value like `top-[7px]` the right call?",
          options: [
            "Always — it's more precise",
            "For genuine one-offs; repeat it and it should become a theme token",
            "Never",
            "Only for colours",
          ],
          answer: 1,
          explanation:
            "Arbitrary values are an escape hatch. Repetition means you've found a token — promote it.",
        },
        {
          q: "The main cost of `@apply` is…",
          options: [
            "Slower builds",
            "It hides the styles from the markup and brings back the naming layer",
            "It breaks dark mode",
            "It can't use variants",
          ],
          answer: 1,
          explanation:
            "You lose the readability that made utilities worthwhile. Keep it for content you don't own.",
        },
        {
          q: "Customising the theme with brand tokens mainly gives you…",
          options: [
            "Smaller CSS",
            "A shared vocabulary so classes express design intent, not raw pixels",
            "Automatic dark mode",
            "Faster runtime",
          ],
          answer: 1,
          explanation:
            "bg-paper-100 and text-gold-400 carry meaning; #f4f1ea and #d4af37 don't.",
        },
      ],
    },
    {
      id: "capstone-ui-kit",
      title: "Capstone: Build a Component Kit",
      minutes: 20,
      preview: {
        brief:
          "Assemble a real UI kit from the primitives you've learned: a badge, a button pair, and a card grid. Structure is graded; the styling is yours to judge.",
        goal:
          "Build .kit containing .badge, .btn-primary, .btn-ghost and at least two .kit-card elements — each card needs an h3. Then style them with utilities and the responsive, dark and motion variants from earlier lessons.",
        html: `<main class="min-h-screen bg-slate-100 p-10">
  <section class="kit mx-auto max-w-3xl">
    <!--
      Build the kit here:
      1. a .badge pill
      2. a .btn-primary and a .btn-ghost
      3. a responsive grid with two or more .kit-card, each with an h3
    -->
  </section>
</main>`,
        requires: [
          ".kit .badge",
          "button.btn-primary",
          "button.btn-ghost",
          ".kit-card h3",
          ".kit-card + .kit-card",
        ],
      },
      body: `Time to build something you'd actually ship. A **component kit** is the smallest useful unit of a design system: a handful of pieces, each with deliberate states, that compose into real screens.

The one you're building here has four parts. Notice that every requirement below *reuses an earlier lesson* — that's the point of a capstone.

**1. The badge** — a pill of metadata. Small, uppercase, generous tracking:

\`\`\`
<span class="badge inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1
             font-mono text-[11px] font-semibold uppercase tracking-widest text-indigo-700">
  new
</span>
\`\`\`

**2. The button pair.** A kit needs a *hierarchy*: one primary action, one quieter alternative. If everything shouts, nothing does.

\`\`\`
<button class="btn-primary rounded-full bg-slate-900 px-5 py-2 font-semibold text-white
                 transition hover:bg-slate-700 active:scale-95
                 focus-visible:ring-2 focus-visible:ring-offset-2
                 disabled:cursor-not-allowed disabled:opacity-50">
  Get started
</button>

<button class="btn-ghost rounded-full border border-slate-300 px-5 py-2 font-semibold
                 text-slate-700 transition hover:border-slate-500 hover:bg-white">
  Learn more
</button>
\`\`\`

**3. The card grid** — responsive from the first line:

\`\`\`
<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  <article class="kit-card group rounded-2xl bg-white p-6 shadow transition hover:shadow-xl">
    <h3 class="font-semibold text-slate-900 transition group-hover:text-indigo-600">Title</h3>
    <p class="mt-1 text-slate-600">Supporting copy.</p>
  </article>
</div>
\`\`\`

**The review checklist — apply it to every component you ever build:**

1. **States** — resting, hover, active, focus-visible, disabled. Missing one is a bug.
2. **Responsive** — does it survive 320px? Does it *use* 1440px?
3. **Dark mode** — can you read it on a dark surface?
4. **Motion** — is it 150–300ms, transform/opacity only, and \`motion-reduce:\` aware?
5. **Contrast** — is text legible against its background at WCAG AA (4.5:1 for body copy)?
6. **Consistency** — are the paddings all from the spacing ladder, or did a \`p-[13px]\` sneak in?

**Extract, then reuse.** Once the kit exists, a new screen is composition: \`<Badge>\`, \`<Button variant="primary">\`, \`<Card>\`. That's the payoff — a design system isn't a document, it's the set of pieces your team reaches for by default.`,
      quiz: [
        {
          q: "Why does a kit need both a primary and a ghost button?",
          options: [
            "For colour variety",
            "Visual hierarchy — competing primary actions make a screen hard to read",
            "Accessibility requires two",
            "Ghost buttons render faster",
          ],
          answer: 1,
          explanation:
            "One clear primary action per view; secondary actions step back. Hierarchy is information design.",
        },
        {
          q: "Which is NOT part of the component review checklist?",
          options: [
            "Interaction states",
            "Contrast ratio",
            "The number of utility classes used",
            "Reduced-motion support",
          ],
          answer: 2,
          explanation:
            "Class count is an implementation detail. States, responsive behaviour, dark mode, motion, contrast and consistency are the quality signals.",
        },
        {
          q: "Extracting a kit's components mainly buys you…",
          options: [
            "Smaller CSS files",
            "Composition — new screens become assembly instead of fresh styling decisions",
            "Automatic tests",
            "Dark mode",
          ],
          answer: 1,
          explanation:
            "The kit becomes the default vocabulary, so consistency is the path of least resistance rather than a rule to remember.",
        },
        {
          q: "A card looks fine at 1440px but breaks at 320px. What's the likely cause?",
          options: [
            "Tailwind doesn't support small screens",
            "A fixed width or a non-wrapping row of content, instead of mobile-first stacking",
            "The dark mode class",
            "Too few breakpoints in the config",
          ],
          answer: 1,
          explanation:
            "Fixed widths and unwrapped flex rows are the usual culprits. Write the base case for the narrowest screen and let prefixes add space back.",
        },
      ],
    },
  ],
};
