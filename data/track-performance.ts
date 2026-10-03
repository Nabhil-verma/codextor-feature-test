import type { Track } from "./types";

export const performanceTrack: Track = {
  id: "performance",
  title: "Web Performance & Accessibility",
  blurb:
    "Core Web Vitals, layout stability, contrast and keyboard semantics — measured, graded, and shipped as one audit-ready page.",
  numeral: "XV",
  optional: true,
  optionalWhy:
    "Four of six lessons are structural preview probes — high value for frontend roles, low signal for generalist screening. Play it when the target job names performance or accessibility.",
  lessons: [
    {
      id: "web-vitals",
      title: "Core Web Vitals: What Users Actually Feel",
      minutes: 11,
      reading: true,
      body: `**Performance is not a number on a dashboard — it's three feelings.** Google's Core Web Vitals measure the moments a real person notices slowness: *loading* (did something appear?), *responsiveness* (did my click do anything?), and *visual stability* (did the page jump under my finger?).

| Vital | Measures | Good | Needs work |
| --- | --- | --- | --- |
| \`LCP\` — Largest Contentful Paint | when the hero image or headline paints | ≤ 2.5s | ≤ 4.0s |
| \`INP\` — Interaction to Next Paint | latency of taps across the whole visit | ≤ 200ms | ≤ 500ms |
| \`CLS\` — Cumulative Layout Shift | how much the layout jumps unexpectedly | ≤ 0.1 | ≤ 0.25 |

**INP replaced FID in March 2024.** First Input Delay only measured the *first* tap; INP measures every interaction and keeps the worst one, which is far closer to how frustration actually accumulates.

**Lab data vs. field data.** Lighthouse runs in a throttled lab on one device — great for regression testing in CI, blind to real networks. Field data (Chrome UX Report / CrUX) comes from millions of real sessions in the wild. **When they disagree, believe the field data.**

**Where LCP time actually goes:**

\`\`\`
TTFB (server + network)  →  resource load delay  →  render delay
\`\`\`

\`\`\`js
// A 900ms LCP often decomposes into:
{ ttfb: 600, loadDelay: 200, renderDelay: 100 }
// Fix the biggest term first — usually the server or a lazy hero.
\`\`\`

**The four fixes that move LCP most:** preload the hero image as \`fetchpriority="high"\`, stop hiding it behind client-side fetches, serve modern formats (AVIF/WebP) and sane dimensions, and keep render-blocking CSS small. Meanwhile, images *below* the fold get \`loading="lazy"\` so they don't compete with the hero.

**CLS is almost always a missing dimension.** Images and embeds without \`width\`/\`height\` (or an \`aspect-ratio\`), ads and banners that arrive late, and fonts that swap to a taller fallback all shove content around. Reserve the space in CSS or attributes and the shift disappears. That's the whole game — and the next lesson makes you fix one for real.`,
      quiz: [
        {
          q: "A 'good' Cumulative Layout Shift score is at or below…",
          options: ["0.1", "0.25", "1.0", "0.5"],
          answer: 0,
          explanation:
            "CLS ≤ 0.1 is good; 0.1–0.25 needs improvement; above 0.25 is poor. Anything near 1.0 means the page effectively reflows as you read it.",
        },
        {
          q: "INP replaced FID because it…",
          options: [
            "runs only in the lab",
            "measures responsiveness across the entire visit, not just the first tap",
            "measures layout instability",
            "measures time to first byte",
          ],
          answer: 1,
          explanation:
            "FID scored only the first interaction. INP scores every interaction and reports a high percentile of the worst, so sustained jank can't hide.",
        },
        {
          q: "CrUX (Chrome User Experience Report) data is…",
          options: [
            "field data aggregated from real users' browsers",
            "lab data from a single emulated device",
            "a JavaScript linter",
            "a bundle-size analyzer",
          ],
          answer: 0,
          explanation:
            "CrUX is real-user measurement across millions of Chrome sessions. Lab tools simulate one run; field data reflects what everyone actually experiences.",
        },
        {
          q: "Which is NOT a typical LCP candidate?",
          options: [
            "The hero <img>",
            "A block-level paragraph of text",
            "An inline <svg> illustration",
            "A video poster frame",
          ],
          answer: 2,
          explanation:
            "LCP candidates are block-level text, images, video posters and background-images. SVGs and zero-size elements don't count.",
        },
        {
          q: "LCP comes in at 4.1s. Which plan attacks the biggest term first?",
          options: [
            "Add more above-the-fold images",
            "Preload the hero, set fetchpriority=\"high\", and stop blocking it behind a client-side fetch",
            "Remove alt text from the hero",
            "Inline every stylesheet on every page",
          ],
          answer: 1,
          explanation:
            "Decompose first: TTFB, load delay, render delay. The hero's load delay and render delay are usually the fat terms — preload and unblock them.",
        },
      ],
    },
    {
      id: "layout-shift",
      title: "Fixing CLS: Reserve the Space",
      minutes: 12,
      preview: {
        brief:
          "The article image arrives and shoves the paragraph down the page. Give the image intrinsic dimensions and alt text — the preview re-renders live as you type.",
        goal:
          "On the hero <img>, add width=\"640\" and height=\"360\" so the space is reserved before it loads, plus an alt attribute describing the release-notes screenshot.",
        html: `<main class="wrap">
  <h1>Release notes</h1>
  <p class="lede">Everything we shipped this week.</p>
  <img class="shot" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23dbe4f0'/%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='20' text-anchor='middle' fill='%2364748b'%3Escreenshot%3C/text%3E%3C/svg%3E">
  <section class="card">
    <h2>Fixed</h2>
    <p>The crash on empty carts, two flaky tests, and the login redirect loop.</p>
  </section>
</main>`,
        css: `.wrap { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem; font-family: system-ui, sans-serif; color: #0f172a; }
.lede { color: #64748b; margin-top: .5rem; }
.shot { display: block; width: 100%; border-radius: .75rem; background: #e2e8f0; }
.card { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: .75rem; }`,
        requires: ["img[width][height]", "img[alt]"],
        framework: "none",
      },
      body: `**Cumulative Layout Shift is the "I didn't mean to click that" metric.** CLS scores *unexpected* movement: content the user didn't initiate that shifts because space wasn't accounted for beforehand. The most common cause by far is media without intrinsic dimensions.

\`\`\`html
<!-- Before: the browser reserves 0px, the image arrives, everything below moves -->
<img src="shot.jpg">

<!-- After: the browser reserves the exact box from the first byte of HTML -->
<img src="shot.jpg" width="640" height="360" alt="Release notes screenshot">
\`\`\`

**Why attributes and not just CSS?** \`width\`/\`height\` on the \`<img>\` element let the browser compute an \`aspect-ratio\` *while parsing the HTML* — before the stylesheet even applies. That's the moment you need, because CLS penalises shifts that happen early. Modern browsers then apply \`height: auto\` behavior automatically when CSS sets \`width: 100%\`, so the classic broken-image-stretch problem is gone.

**The pattern that covers responsive images too:**

\`\`\`css
.shot {
  aspect-ratio: 16 / 9;  /* reserve the box from CSS when there's no attribute pair */
  width: 100%;
  height: auto;
}
\`\`\`

**The other usual suspects:**

- **Ads, banners, cookie notices** that inject above existing content → reserve a fixed slot, or overlay them.
- **Web fonts** that swap to a taller fallback → \`font-display: optional\` or size-adjusted fallbacks.
- **Lazy images at the bottom of the viewport** that push content *up* as they load → same fix: dimensions.
- **Anything injected by JS before the fold** → the framework should reserve skeleton space.

**What does NOT count as bad CLS:** the user clicking an accordion or scrolling a lazy list. Shifts the *user causes* are excluded by design — the metric is about surprise.`,
      quiz: [
        {
          q: "Why add width/height attributes rather than only CSS?",
          options: [
            "Attributes are required by the HTML validator",
            "They let the browser derive an aspect-ratio while parsing, reserving space before stylesheets or images load",
            "They make the image load faster",
            "CSS dimensions are ignored for images",
          ],
          answer: 1,
          explanation:
            "Early reservation is the whole point: the parse-time aspect ratio means the box exists before the image bytes or even the stylesheet arrive.",
        },
        {
          q: "A cookie banner slides in above the footer and pushes content down. The fix is…",
          options: [
            "Reserve a slot for it, or render it as an overlay",
            "Animate it slower",
            "Remove the footer",
            "Load it with loading=\"lazy\"",
          ],
          answer: 0,
          explanation:
            "Late-arriving content must either own space from the start or not take space at all. Overlays shift nothing beneath them.",
        },
        {
          q: "A user opens an accordion and the page below moves. This…",
          options: [
            "counts as bad CLS",
            "doesn't count — shifts the user initiates are excluded",
            "counts double",
            "only counts on mobile",
          ],
          answer: 1,
          explanation:
            "CLS measures *unexpected* movement. Expanding something the user clicked is expected — the API excludes shifts within 500ms of user input.",
        },
        {
          q: "Which font setup minimises CLS?",
          options: [
            "font-display: block with no fallback metrics",
            "font-display: optional (or a metric-matched fallback)",
            "font-display: swap with a much taller fallback",
            "No fallback family at all",
          ],
          answer: 1,
          explanation:
            "Swap with a mismatched fallback paints the fallback then reflows on swap. optional (or matched metrics) avoids the swap-time shift entirely.",
        },
        {
          q: "Below-the-fold images should usually get…",
          options: [
            "loading=\"lazy\" AND width/height — both, so they don't compete with the hero and don't shift when they arrive",
            "only loading=\"lazy\"",
            "only width/height",
            "neither, for performance",
          ],
          answer: 0,
          explanation:
            "Lazy-loading protects LCP; dimensions protect CLS. They solve different problems and compose freely.",
        },
      ],
    },
    {
      id: "contrast",
      title: "Contrast: Reading Is a Feature",
      minutes: 11,
      preview: {
        brief:
          "This hero ships with washed-out greys on white — it looks 'minimal' and fails WCAG. Darken the text and lift the button so every line passes AA.",
        goal:
          "Change the h1 to class text-slate-900, the paragraph to text-slate-700, and the button background to bg-indigo-600 (keep text-white).",
        html: `<main class="min-h-screen bg-white">
  <section class="hero px-6 py-20 text-center">
    <p class="text-sm uppercase tracking-widest text-slate-500">v2.0</p>
    <h1 class="mt-4 text-4xl font-bold text-slate-400">Ship faster with Freebuff</h1>
    <p class="mx-auto mt-4 max-w-xl text-slate-400">A hands-on curriculum that grades what you actually run, not what you memorize.</p>
    <button class="mt-8 rounded-lg bg-indigo-300 px-6 py-3 font-semibold text-white shadow-sm">Start free</button>
  </section>
</main>`,
        requires: [
          "h1.text-slate-900",
          "p.text-slate-700",
          "button.bg-indigo-600",
        ],
      },
      body: `**Contrast is the accessibility rule with the clearest math.** WCAG defines a contrast ratio between 1:1 and 21:1 from the *relative luminance* of the two colors:

\`\`\`
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
\`\`\`

**The thresholds you must know by heart:**

| Content | Level AA | Level AAA |
| --- | --- | --- |
| Body text (< 24px / < 18.66px bold) | **4.5:1** | 7:1 |
| Large text (≥ 24px, or ≥ 18.66px bold) | **3:1** | 4.5:1 |
| UI components & focus indicators | **3:1** | — |

\`\`\`js
// Relative luminance, sRGB channel-wise:
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (fg, bg) => {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
ratio([255, 255, 255], [129, 140, 248]); // ≈ 2.9 — white on indigo-400 FAILS
ratio([255, 255, 255], [79, 70, 229]);   // ≈ 6.3 — white on indigo-600 passes
\`\`\`

**That's exactly the bug in this preview**: \`text-slate-400\` on white is ~3.1:1 — pretty in a mockup, illegible on a phone in sunlight. \`text-slate-900\` is 17+:1. The button's \`bg-indigo-300\` with white text sits near 1.9:1; \`bg-indigo-600\` clears AA comfortably.

**Where teams get contrast wrong:**

- **Placeholder text** at gray-300 — it's content, it gets read.
- **Placeholders *as labels*** — also an ARIA failure; keep a real \`<label>\`.
- **Opacity-faded disabled states** — disabled controls are exempt from contrast minimums, but if users must read them, they still need to be legible.
- **Gradients** — grade the *worst* point a glyph can land on, not the average.
- **Placeholder images with text baked in** — same math applies.

**Grade it in CI or in the browser**: Lighthouse flags it, axe DevTools pinpoints the node, and the DevTools color picker shows any two colors' ratio while you tweak.`,
      quiz: [
        {
          q: "WCAG AA requires body text to reach…",
          options: ["3:1", "4.5:1", "7:1", "2:1"],
          answer: 1,
          explanation:
            "4.5:1 for normal text, 3:1 for large text (24px+, or 18.66px+ bold). 7:1 is the stricter AAA level for body copy.",
        },
        {
          q: "Large text (≥ 24px) may pass AA at…",
          options: ["3:1", "4.5:1", "7:1", "It has no exemption"],
          answer: 0,
          explanation:
            "Big text is easier to read at lower contrast, so the requirement relaxes to 3:1 — still well above decorative gray-on-white.",
        },
        {
          q: "White text on #818cf8 (indigo-400) is about 2.9:1. The right fix is…",
          options: [
            "Lower the font size",
            "Darken the background (e.g. indigo-600) or use dark text on the light background",
            "Add a shadow",
            "Nothing — it's a button, so exempt",
          ],
          answer: 1,
          explanation:
            "Buttons are UI + text: the fix is color, not tricks. Shadows don't reliably count toward the measured ratio; exempted cases are rare.",
        },
        {
          q: "The contrast ratio is computed from…",
          options: [
            "Hue distance",
            "Relative luminance of each color: (L1 + 0.05) / (L2 + 0.05)",
            "Average RGB values",
            "Pixel count on screen",
          ],
          answer: 1,
          explanation:
            "Luminance maps sRGB channels to perceived light, linearized first. The +0.05 terms keep pure black from dividing by zero.",
        },
        {
          q: "Which is ALSO an accessibility failure, not just a contrast issue?",
          options: [
            "Using <label> for every input",
            "Using the placeholder attribute as the only input label",
            "Dark mode support",
            "WebP images",
          ],
          answer: 1,
          explanation:
            "Placeholders vanish on input, fail to associate programmatically, and are usually too low-contrast anyway. Keep a real <label>.",
        },
      ],
    },
    {
      id: "keyboard-focus",
      title: "Keyboard & Semantics: Real Elements Win",
      minutes: 12,
      preview: {
        brief:
          "The nav is three clickable divs and there's no way past it — tab users get lost before the content starts. Replace the lookalikes with real elements.",
        goal:
          "Convert the three .link divs into <a> anchors with their hrefs, give the <main> element id=\"main\", and add a skip link as the first element of <body>: <a class=\"skip\" href=\"#main\">Skip to content</a>.",
        html: `<body class="min-h-screen bg-slate-50 font-sans text-slate-900">
  <nav class="flex gap-6 border-b bg-white px-6 py-4 shadow-sm">
    <div class="link cursor-pointer font-medium hover:text-indigo-600" onclick="location.hash='#home'">Home</div>
    <div class="link cursor-pointer font-medium hover:text-indigo-600" onclick="location.hash='#docs'">Docs</div>
    <div class="link cursor-pointer font-medium hover:text-indigo-600" onclick="location.hash='#pricing'">Pricing</div>
  </nav>
  <main class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-3xl font-bold">Focus is a first-class input</h1>
    <p class="mt-4 text-slate-600">If it can be clicked, it can be tabbed — make sure it actually can.</p>
  </main>
</body>`,
        requires: ["main#main", "a.skip[href=\"#main\"]", "nav a[href]"],
      },
      body: `**A div with an onclick is a button cosplay.** It looks right with a mouse and is invisible to everyone else: no Tab stop, no Enter/Space activation, no role in the accessibility tree, no default focus behavior. The browser ships all of that for free — in \`<button>\` and \`<a href>\`.

\`\`\`html
<!-- lookalike: not focusable, not announced, no keyboard activation -->
<div class="link" onclick="go()">Docs</div>

<!-- real: focusable, announced as "link", Enter activates, browser handles the rest -->
<a href="/docs">Docs</a>
\`\`\`

**The landmark & skip-link pattern.** On every page, a keyboard user's first Tab should offer "skip to main" — otherwise they re-traverse your entire nav on every page:

\`\`\`html
<body>
  <a class="skip" href="#main">Skip to content</a>
  <nav>…</nav>
  <main id="main">…</main>
</body>
\`\`\`

**Focus visibility is not optional.** \`outline: none\` with nothing in its place is the single most common accessibility regression in hand-rolled CSS. Style the *keyboard-only* ring so mouse users aren't annoyed:

\`\`\`css
:focus-visible { outline: 2px solid indigo; outline-offset: 2px; }
\`\`\`

**The tabindex rules that keep you out of trouble:**

- \`tabindex="0"\` — join the natural tab order (only for things you've made widget-like).
- \`tabindex="-1"\` — programmatically focusable (perfect for the skip-link *target*).
- **Positive values (\`tabindex="5"\`) — never.** They hijack the document order and create exactly the confusion you were trying to avoid.

**Names, roles, values.** An icon-only button needs an accessible name: \`aria-label="Close dialog"\` or visually-hidden text. A custom dropdown needs \`role\` + \`aria-expanded\`. But reach for native elements first — <button>, <a>, <label>, <details> — and most of the ARIA disappears.`,
      quiz: [
        {
          q: "Why is <a href> the right element for nav items?",
          options: [
            "It renders faster than a div",
            "It's focusable, announced as a link, activated by Enter, and supports browser affordances like middle-click and copy link",
            "It's the only element CSS can style",
            "It is required by HTML validation",
          ],
          answer: 1,
          explanation:
            "Semantics come with the element: role, keyboard activation, and every browser feature keyed to links. A div gets none of it.",
        },
        {
          q: "Removing outline: none without a replacement…",
          options: [
            "Has no effect on accessibility",
            "Leaves keyboard users with no indication of focus — the most common a11y regression",
            "Speeds up rendering",
            "Is required for dark mode",
          ],
          answer: 1,
          explanation:
            "The focus ring IS the pointer for keyboard users. Use :focus-visible so the ring appears for keyboards without following the mouse.",
        },
        {
          q: "tabindex=\"5\" on a footer link is…",
          options: [
            "Good — it makes it important",
            "Harmful — positive values override the document's natural tab order and scramble navigation",
            "Required for footers",
            "The same as tabindex=\"0\"",
          ],
          answer: 1,
          explanation:
            "Positive tabindex values jump that element ahead of everything with a lower number, creating a tab order nobody can predict. Use 0 or -1.",
        },
        {
          q: "The skip link's target should get…",
          options: [
            "tabindex=\"-1\" (if it isn't naturally focusable) so focus actually lands inside <main>",
            "tabindex=\"100\"",
            "autofocus",
            "role=\"button\"",
          ],
          answer: 0,
          explanation:
            "Clicking an in-page link moves the *viewport*, but keyboard focus can stop short on older engines — tabindex=\"-1\" guarantees focus lands on the region.",
        },
        {
          q: "An icon-only close button with no text needs…",
          options: [
            "title attribute only",
            "an accessible name — aria-label=\"Close\" or visually hidden text",
            "A tooltip",
            "Nothing, icons are universal",
          ],
          answer: 1,
          explanation:
            "Screen readers announce the accessible name; an empty button announces as 'button'. aria-label is the standard fix.",
        },
      ],
    },
    {
      id: "critical-rendering",
      title: "The Rendering Path: Reflow, Repaint, Restyle",
      minutes: 12,
      reading: true,
      sort: {
        prompt:
          "Order the critical rendering path, from typing the URL to pixels on screen.",
        items: [
          "DNS lookup resolves the host",
          "TCP handshake + TLS negotiate the connection",
          "HTML arrives; the parser builds the DOM",
          "CSSOM and DOM combine into the render tree",
          "Layout computes geometry, paint fills the pixels",
        ],
        explanation:
          "Network first, then parse, then style+layout+paint. Anything render-blocking (sync CSS or JS before the fold) stalls step 4 — which is why defer/async and small CSS move the needle.",
      },
      body: `**Every frame, the browser runs a pipeline — and only some of it is avoidable:**

\`\`\`
style  →  layout (reflow)  →  paint  →  composite
\`\`\`

- **Reflow** recalculates geometry — the expensive one. Touch a layout property (\`width\`, \`top\`, \`margin\`, \`font-size\`) and every dependent box is re-measured.
- **Repaint** rasterizes pixels — cheaper, but still work.
- **Composite** moves pre-rendered layers with the GPU — cheapest, and the *only* stage that runs at 60fps without touching layout.

**This is why \`transform\` and \`opacity\` animate smoothly and \`top\`/\`margin\` do not:**

\`\`\`css
.card { transition: transform .2s; }        /* composited — GPU layer, no reflow */
.card:hover { transform: translateY(-4px); }

.card-bad { transition: top .2s; }          /* reflows EVERY frame */
.card-bad:hover { top: 4px; }
\`\`\`

**Render-blocking resources stall the whole pipeline.** A sync \`<script>\` in \`<head>\` halts parsing; a \`<link rel="stylesheet">\` blocks the first paint until the CSS downloads. The fixes are canonical:

\`\`\`html
<script src="app.js" defer></script>   <!-- runs after parsing, in order — the default you want -->
<script src="analytics.js" async></script> <!-- runs whenever; breaks document order -->
\`\`\`

- **\`defer\`** for your app scripts (order preserved, DOM ready).
- **\`async\`** only for independent one-offs like analytics.
- **\`font-display: swap\`** so text paints in a fallback instead of staying invisible.
- **Code-split** at route boundaries: the user downloads this route, not the whole app.

** \`will-change: transform\` promises a layer — keep the promise short.** It tells the browser to promote an element to its own composited layer *early*. That's the fix for one-off janky transitions; applied to 50 elements at once it's a memory leak with a GPU bill. Set it right before the animation, remove it after — or better, let the browser decide.

**Measure, don't guess.** The Performance panel's flame chart shows exactly which frames reflowed. And honor motion preferences while you're in there:

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
\`\`\`

Vestibular disorders make large parallax and slide transitions genuinely painful. One media query is the whole accommodation — the next lesson's capstone puts it on a real button.`,
      quiz: [
        {
          q: "Which script tag preserves document order and waits for the DOM?",
          options: ["async", "defer", "Neither — both are identical", "type=\"module\" blocks parsing"],
          answer: 1,
          explanation:
            "defer runs after the document is parsed, in insertion order. async runs the moment the file arrives, in whatever order that happens.",
        },
        {
          q: "Animating \`top: 0 → 100px\` is janky because it…",
          options: [
            "Triggers style recalculation and layout on every frame (reflow)",
            "Only repaints one pixel",
            "Uses the GPU automatically",
            "Is blocked by the network",
          ],
          answer: 0,
          explanation:
            "top is a layout property: each frame re-measures geometry, then repaints. transform moves a pre-composited layer instead — one cheap stage.",
        },
        {
          q: "CSS in <head> blocks first paint because…",
          options: [
            "CSS is executed like JavaScript",
            "The browser won't render content it might have to restyle — it waits for the rules",
            "Stylesheets download slower than HTML by spec",
            "It doesn't — CSS never blocks rendering",
          ],
          answer: 1,
          explanation:
            "Rendering without complete styles guarantees a visible flash of unstyled content. The browser stalls first paint until the CSS arrives — keep it small and critical-path only.",
        },
        {
          q: "font-display: swap mainly improves…",
          options: [
            "CLS only",
            "Perceived load — text paints immediately in the fallback instead of staying invisible",
            "Bundle size",
            "Security",
          ],
          answer: 1,
          explanation:
            "The default (font-display: auto/block) can hide text for seconds while the webfont downloads. swap shows fallback text now and upgrades in place.",
        },
        {
          q: "will-change: transform on every list item…",
          options: [
            "Is the recommended default",
            "Promotes dozens of layers — memory/GPU cost that outweighs the win; reserve it for elements actively animating",
            "Removes the need for transforms",
            "Disables compositing",
          ],
          answer: 1,
          explanation:
            "Each promoted layer costs memory and bookkeeping. Use it surgically around an animation, or drop it entirely and let the browser promote what it must.",
        },
      ],
    },
    {
      id: "capstone-audit",
      title: "Capstone: The Performance & A11y Audit",
      minutes: 20,
      preview: {
        brief:
          "One page, four regressions shipped together — CLS, contrast, keyboard traps, and motion sickness. Audit it the way you would a PR and fix all four.",
        goal:
          "1) Give the hero img width=\"640\" height=\"360\" plus descriptive alt. 2) h1 → text-slate-900, the intro p → text-slate-700, the button → bg-indigo-600. 3) Convert the nav divs to <a> anchors, add id=\"main\" to <main>, and prepend <a class=\"skip\" href=\"#main\">Skip to content</a> to <body>. 4) Add class motion-reduce:animate-none to the bouncing .cta button.",
        html: `<body class="min-h-screen bg-white font-sans text-slate-900">
  <nav class="flex gap-6 border-b bg-white px-6 py-4">
    <div class="link font-medium" onclick="location.hash='#product'">Product</div>
    <div class="link font-medium" onclick="location.hash='#pricing'">Pricing</div>
    <div class="link font-medium" onclick="location.hash='#login'">Log in</div>
  </nav>
  <main class="mx-auto max-w-3xl px-6 py-14">
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='18' text-anchor='middle' fill='%2364748b'%3Edashboard%3C/text%3E%3C/svg%3E" class="mt-6 w-full rounded-xl">
    <h1 class="mt-8 text-4xl font-bold text-slate-400">Your dashboard, minus the guesswork</h1>
    <p class="mt-4 text-slate-400">See every deploy, every metric, and every regression in one place — before your users tweet about it.</p>
    <button class="cta mt-8 animate-bounce rounded-lg bg-indigo-300 px-6 py-3 font-semibold text-white">Start free trial</button>
  </main>
</body>`,
        requires: [
          "img[width][height]",
          "img[alt]",
          "h1.text-slate-900",
          "p.text-slate-700",
          "button.bg-indigo-600",
          "main#main",
          "a.skip[href=\"#main\"]",
          "nav a[href]",
          "button.motion-reduce\\:animate-none",
        ],
      },
      body: `The capstone is an audit, exactly like a real review: **read the page, find every class of regression, and fix each one at the structural level.** Grading checks the finished markup against all nine selectors — four lessons' worth of rules on one screen.

**1 · Layout stability (CLS).** The hero \`<img>\` has no \`width\`/\`height\`, so its box reserves zero pixels until the SVG arrives — everything below jumps. The fix from lesson two: intrinsic dimensions *and* an \`alt\` that describes the dashboard screenshot for anyone who can't see it.

**2 · Contrast (WCAG AA).** \`text-slate-400\` on white is ~3.1:1 — under the 4.5:1 bar for body copy and under even the 3:1 large-text bar. The h1 goes to \`text-slate-900\` (17:1), the intro to \`text-slate-700\` (~10:1), and the CTA's \`bg-indigo-300\` (white text ≈ 1.9:1) to \`bg-indigo-600\` (≈ 6.3:1). Check the math if you don't trust it — it's in lesson three.

**3 · Keyboard & semantics.** Three \`<div onclick>\` lookalikes: not focusable, not announced, no Enter/Space. Make them \`<a href="#…">\`. Give \`<main>\` an \`id="main"\`, and prepend the skip link so the *first* Tab on the page jumps past the nav.

**4 · Motion.** \`animate-bounce\` on the primary CTA is decorative by nature — which makes it exactly the thing \`prefers-reduced-motion\` exists to suppress:

\`\`\`html
<button class="cta animate-bounce motion-reduce:animate-none …">Start free trial</button>
\`\`\`

Tailwind's \`motion-reduce:\` variant compiles to the \`prefers-reduced-motion\` media query — one class, and users who asked their OS for less motion stop being bounced at.

**Why all four on one page?** Because that's how they ship in production: nobody deploys a "contrast feature." The audit habit — structure, then contrast, then keyboard, then motion — is the deliverable. Run it on every PR and the complaints never arrive.`,
      quiz: [
        {
          q: "The single highest-impact CLS fix on this page is…",
          options: [
            "Adding width and height to the hero <img>",
            "Renaming the .cta class",
            "Moving <nav> after <main>",
            "Removing the SVG",
          ],
          answer: 0,
          explanation:
            "Undimensioned media before the fold is the classic shift source: reserve the box in the HTML and everything below it stays put.",
        },
        {
          q: "The CTA's white text on bg-indigo-300 fails AA because…",
          options: [
            "The font is too small only",
            "It measures ~1.9:1 — far below the 4.5:1 required for normal-size text",
            "Buttons are judged at 7:1",
            "Indigo is not a valid color",
          ],
          answer: 1,
          explanation:
            "Contrast is a ratio, not a vibe: white on indigo-300 is under 2:1. bg-indigo-600 (~6.3:1) clears AA with room to spare.",
        },
        {
          q: "The three nav divs are broken for keyboard users because they…",
          options: [
            "Have the wrong color",
            "Are not focusable and have no link role or Enter-key activation",
            "Are inside <nav>",
            "Use onclick",
          ],
          answer: 1,
          explanation:
            "A div is a generic box: no tab stop, no role, no key handling. Anchors restore all three plus browser affordances.",
        },
        {
          q: "motion-reduce:animate-none works by…",
          options: [
            "Deleting the animation at build time",
            "Compiling to @media (prefers-reduced-motion: reduce), suppressing the bounce for users who requested it",
            "Disabling all CSS animations globally",
            "Only pausing on mobile devices",
          ],
          answer: 1,
          explanation:
            "It's a variant prefix — same mechanism as hover:. The request comes from the OS accessibility setting, scoped to this one utility.",
        },
        {
          q: "The skip link only does its job if…",
          options: [
            "It is the first focusable element and #main exists as the target",
            "It is styled hidden from everyone",
            "It sits after the nav",
            "It uses a JavaScript scroll handler",
          ],
          answer: 0,
          explanation:
            "First in DOM order means it's the first Tab stop; a matching id means focus and viewport both land in the content. No JS required.",
        },
      ],
    },
  ],
};
