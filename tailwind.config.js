/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      /*
       * Every color resolves through a CSS variable (declared in src/index.css
       * for both :root and .dark), so the whole palette — surfaces, text,
       * borders and accents — flips with one class on <html>. Values are
       * space-separated RGB channels so Tailwind's `/opacity` modifiers keep
       * working unchanged.
       */
      colors: {
        // warm off-white page surfaces (dark: near-black)
        paper: {
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          50: "rgb(var(--paper-50) / <alpha-value>)",
          100: "rgb(var(--paper-100) / <alpha-value>)",
          200: "rgb(var(--paper-200) / <alpha-value>)",
          300: "rgb(var(--paper-300) / <alpha-value>)",
        },
        // near-black text + dark code windows (dark: warm light text)
        ink: {
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          950: "rgb(var(--ink-950) / <alpha-value>)",
        },
        // metallic gold accent (dark: brightened so it reads on black)
        gold: {
          300: "rgb(var(--gold-300) / <alpha-value>)",
          400: "rgb(var(--gold-400) / <alpha-value>)",
          500: "rgb(var(--gold-500) / <alpha-value>)",
          600: "rgb(var(--gold-600) / <alpha-value>)",
          700: "rgb(var(--gold-700) / <alpha-value>)",
        },
      },
      boxShadow: {
        glow: "0 0 22px rgba(212, 175, 55, 0.18)",
        lift: "0 1px 2px rgba(28, 25, 23, 0.05), 0 8px 24px rgba(28, 25, 23, 0.06)",
      },
    },
  },
  plugins: [],
};
