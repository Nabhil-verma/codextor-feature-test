import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { Orb } from "../components/motion";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="relative mx-auto max-w-3xl overflow-hidden px-4 py-28 text-center">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="left-[20%] top-[10%] bg-gold-400/10" size={220} duration={13} />
          <Orb className="right-[15%] bottom-[5%] bg-paper-200/40" size={160} duration={10} delay={1} />
        </div>

        <div className="relative z-10" style={{ perspective: "900px" }}>
          <motion.p
            className="gradient-text font-display text-7xl font-semibold"
            initial={{ opacity: 0, scale: 0.7, rotateX: 60 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformPerspective: 900 }}
          >
            404
          </motion.p>
          <motion.h1
            className="mt-6 font-display text-3xl font-semibold text-ink-950"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            SyntaxError: page not found
          </motion.h1>
          <motion.p
            className="mx-auto mt-3 max-w-md text-ink-600"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            Unexpected token at line 1, column 1. The page you're looking for
            doesn't exist.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link to="/" className="btn-primary mt-10">
              Back to safety
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
