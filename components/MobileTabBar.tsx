import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Code2, Swords, Trophy, UserRound } from "lucide-react";
import { useAccount } from "../AccountProvider";
import { useIsMobile } from "../lib/useMediaQuery";

/*
 * The phone shell's primary navigation: a fixed bottom bar, thumb-reachable,
 * the way a native app navigates. It replaces the desktop nav row for signed-in
 * phones (the top strip stays as a scrollable secondary nav).
 */
const tabs = [
  {
    to: "/learn",
    label: "Lessons",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/learn"),
  },
  {
    to: "/playground",
    label: "Playground",
    icon: Code2,
    match: (p: string) => p.startsWith("/playground"),
  },
  {
    to: "/clans",
    label: "Guilds",
    icon: Swords,
    match: (p: string) => p.startsWith("/clans"),
  },
  {
    to: "/leaderboard",
    label: "Board",
    icon: Trophy,
    match: (p: string) => p.startsWith("/leaderboard"),
  },
  {
    to: "/portfolio",
    label: "Profile",
    icon: UserRound,
    match: (p: string) => p.startsWith("/portfolio"),
  },
];

export default function MobileTabBar() {
  const { user, authReady } = useAccount();
  const { pathname } = useLocation();
  const mobile = useIsMobile();
  const visible = mobile && authReady && !!user;

  /*
   * Tag <html> while the bar is on screen so CSS can reserve scroll room at
   * the bottom of every page — otherwise the bar covers the last row.
   */
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.classList.add("has-tabbar");
    return () => root.classList.remove("has-tabbar");
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.nav
      aria-label="Mobile navigation"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-paper-200/60 pb-[env(safe-area-inset-bottom)] print:hidden md:hidden"
      initial={{ y: 96, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2.5"
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-pill"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl bg-gold-400/15"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    aria-hidden
                  />
                )}
                <Icon
                  className={
                    "relative h-5 w-5 transition-colors " +
                    (active ? "text-gold-600" : "text-ink-500")
                  }
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span
                  className={
                    "relative font-mono text-[10px] uppercase tracking-widest transition-colors " +
                    (active ? "font-bold text-ink-950" : "text-ink-500")
                  }
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
