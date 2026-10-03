import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

/** Light/dark switch in the nav — the whole palette flips with it. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Night mode"}
      className={
        "flex h-8 w-8 items-center justify-center rounded-full border border-paper-200/70 text-ink-600 transition hover:border-gold-400 hover:text-gold-600 hover:shadow-glow " +
        className
      }
    >
      {dark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
