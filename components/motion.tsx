import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

/* ═══════════════════════════════════════════════════════════════
   Shared Framer-Motion primitives — the visual DNA of the site.
   Reveal · PageFade · Tilt · Marquee · Orb · Magnetic
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────── Fade-up when scrolled into view */

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Page-enter fade — wrap each route's outermost <main>. */
export function PageFade({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────── Mouse-tracking 3D tilt card */

export function Tilt({
  children,
  className,
  max = 9,
  scale = 1.02,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const s = useMotionValue(1);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, o: 0 });

  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const srx = useSpring(rx, spring);
  const sry = useSpring(ry, spring);
  const ss = useSpring(s, spring);

  function onMove(e: ReactMouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    s.set(scale);
    setGlarePos({ x: px * 100, y: py * 100, o: 1 });
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
    s.set(1);
    setGlarePos((p) => ({ ...p, o: 0 }));
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        rotateX: srx,
        rotateY: sry,
        scale: ss,
        transformStyle: "preserve-3d",
        transformPerspective: 900,
        position: "relative",
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: glarePos.o,
            background: `radial-gradient(420px circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.10), transparent 55%)`,
          }}
        />
      )}
    </motion.div>
  );
}

/* ─────────────────────────────── Infinite horizontal marquee */

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

export function Marquee({
  children,
  speed = 40,
  reverse = false,
  className,
  fadeColor,
}: {
  children: ReactNode;
  /** pixels per second */
  speed?: number;
  reverse?: boolean;
  className?: string;
  /** color behind the soft edge fades (defaults to transparent → no fade) */
  fadeColor?: string;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  const [copyW, setCopyW] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    const measure = () => setCopyW(copyRef.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useAnimationFrame((_, delta) => {
    if (!copyW) return;
    const dir = reverse ? 1 : -1;
    const next = x.get() + dir * speed * (delta / 1000);
    x.set(wrap(-copyW, 0, next));
  });

  return (
    <div className={"relative overflow-hidden " + (className ?? "")}>
      {fadeColor && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
            style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
            style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
          />
        </>
      )}
      <motion.div
        className="flex w-max items-center will-change-transform"
        style={{ x }}
      >
        <div ref={copyRef} className="flex items-center">
          {children}
        </div>
        <div className="flex items-center" aria-hidden>
          {children}
        </div>
        <div className="flex items-center" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────── Floating gradient orb */

export function Orb({
  className = "",
  size = 320,
  duration = 14,
  delay = 0,
  style,
}: {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.span
      aria-hidden
      className={"pointer-events-none absolute rounded-full blur-3xl " + className}
      style={{ width: size, height: size, ...style }}
      animate={{
        y: [0, -28, 12, 0],
        x: [0, 18, -12, 0],
        scale: [1, 1.06, 0.97, 1],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ─────────────────────────────── Magnetic hover (buttons) */

export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });

  function onMove(e: ReactMouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }

  return (
    <motion.div
      ref={ref}
      className={"inline-block " + (className ?? "")}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export type { MotionValue };
