import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Nav from "../components/Nav";
import { Orb, Reveal, Tilt } from "../components/motion";
import { PanelBoundary, RankFrame } from "../components/gamification/Pieces";
import { Crown, ShieldHalf, UserCog } from "lucide-react";
import { GUILD_TIERS, guildTierFor } from "../lib/guild";
import { friendly } from "../lib/friendlyError";
import type { ClanView } from "../convex/clans";
import ClanQuestPanel from "../components/clan/ClanQuestPanel";
import ClanFeed from "../components/clan/ClanFeed";

const EASE = [0.22, 1, 0.36, 1] as const;

const inputCls =
  "w-full rounded-xl border border-paper-300 bg-paper-50 px-4 py-2.5 text-sm text-ink-950 outline-none transition placeholder:text-ink-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25";

/** Shape returned by `clans.list` / `clans.mine`, defined by the backend. */
type Guild = ClanView;

export default function Clans() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <section className="relative overflow-hidden mesh-bg noise-overlay">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="left-[10%] top-[15%] bg-gold-400/10" size={230} duration={16} />
          <Orb className="right-[8%] top-[30%] bg-paper-200/40" size={190} duration={12} delay={1} />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-16 text-center">
          <Reveal>
            <p className="eyebrow">guild hall</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              Study in a pack
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-600">
              Guilds pool their members' XP. Every lesson you finish lifts the whole
              banner up the board — and unlocks collective rewards nobody earns alone.
            </p>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 pb-24">
        {/*
          * One boundary around every live guild panel — including the rewards
          * ladder, which used to sit outside it and took the whole app down
          * when the backend had no `clans:*` functions deployed yet.
          */}
        <PanelBoundary message="Guilds need the guild server to be reachable. You can still earn XP, lessons and titles in the meantime.">
          <GuildSection />
          <GuildBoard />
          <RewardsLadder />
        </PanelBoundary>
      </main>
    </div>
  );
}

/* ─────────────────────── Your guild ─────────────────────── */

function GuildSection() {
  const mine = useQuery(api.clans.mine);
  if (mine === undefined) {
    return <div className="mt-8 h-56 animate-pulse rounded-2xl bg-paper-100/70" />;
  }
  return mine ? <MyGuild guild={mine} /> : <CreateGuild />;
}

/** Crown for the founder, shield for an officer, nothing for members. */
function RoleChip({ role }: { role: Guild["members"][number]["role"] }) {
  if (role === "owner") {
    return (
      <span
        title="Founder"
        className="inline-flex items-center gap-1 rounded-full border border-gold-400/50 bg-gold-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gold-300"
      >
        <Crown className="h-3 w-3" aria-hidden />
        founder
      </span>
    );
  }
  if (role === "officer") {
    return (
      <span
        title="Officer"
        className="inline-flex items-center gap-1 rounded-full border border-sky-400/50 bg-sky-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-sky-300"
      >
        <ShieldHalf className="h-3 w-3" aria-hidden />
        officer
      </span>
    );
  }
  return null;
}

/** Exported for the roster tests — the page renders it for the caller's guild. */
export function MyGuild({ guild }: { guild: Guild }) {
  const leave = useMutation(api.clans.leave);
  const setRole = useMutation(api.clans.setRole);
  const kick = useMutation(api.clans.kick);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmKickFor, setConfirmKickFor] = useState<string | null>(null);
  const [menuBusy, setMenuBusy] = useState(false);
  const confirmTimer = useRef<number | null>(null);
  const tier = guildTierFor(guild.totalXp);

  const runMenuAction = async (fn: () => Promise<unknown>) => {
    setMenuBusy(true);
    setError(null);
    try {
      await fn();
      setMenuFor(null);
      setConfirmKickFor(null);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setMenuBusy(false);
    }
  };

  // Two-step kick: the first tap primes the row for 3 seconds.
  const primeKick = (userId: string) => {
    setConfirmKickFor(userId);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmKickFor(null), 3000);
  };

  return (
    <Reveal className="mt-8">
      <div className="dark-canvas glass-edge-dark noise-overlay relative overflow-hidden rounded-3xl p-7">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="-right-14 -top-14 bg-gold-400/20" size={220} duration={14} />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-gold-400/50 bg-ink-950/70">
              <span className="font-mono text-lg font-bold text-gold-300">
                {guild.tag}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-paper-300/70">
                guild
              </span>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-400">
                {guild.isOwner ? "your guild · founder" : "your guild"}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-paper-50">
                {guild.name}
              </p>
              <p className="mt-1 max-w-md text-sm text-paper-300/80">{guild.blurb}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-display text-3xl font-bold text-gold-300">
              {guild.totalXp.toLocaleString()}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper-300/70">
              pooled xp · {guild.tier}
            </p>
            <p className="mt-1 font-mono text-[11px] text-paper-300/70">
              +{guild.weekXp.toLocaleString()} this week
            </p>
          </div>
        </div>

        {/* Guild tier progress */}
        <div className="relative mt-6">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-paper-300/70">
            <span>{tier.tier.name}</span>
            <span>{tier.next ? tier.next.name + " at " + tier.next.minXp.toLocaleString() : "max tier"}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-paper-100/15">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
              initial={{ width: 0 }}
              animate={{ width: tier.pct + "%" }}
              transition={{ duration: 1, ease: EASE }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-paper-300/70">
            {tier.next
              ? tier.toNext.toLocaleString() + " pooled XP unlocks: " + tier.next.perk
              : "every collective reward is unlocked — you legends"}
          </p>
        </div>

        {/* Co-op clan quest — pooled goal bar + contributors + claim */}
        <ClanQuestPanel />

        {/* Members + live chronicle */}
        <div className="relative mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gold-400">
              roster · {guild.memberCount}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {guild.members.map((m, i) => {
                const menuOpen = menuFor === m.userId;
                const kickPrimed = confirmKickFor === m.userId;
                const canPromote = guild.isOwner && !m.isMe;
                const canKickTarget =
                  !m.isMe &&
                  (guild.isOwner || (guild.myRole === "officer" && m.role === "member"));
                return (
                  <motion.li
                    key={m.userId}
                    className={
                      "flex items-center gap-3 rounded-xl border px-3 py-2 " +
                      (m.isMe
                        ? "border-gold-400/60 bg-gold-400/10"
                        : "border-paper-100/15 bg-paper-100/5")
                    }
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
                  >
                    <RankFrame name={m.name} level={m.level} ascension={m.ascension} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-display text-sm font-semibold text-paper-50">
                          {m.name}
                        </span>
                        {m.isMe && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-gold-300">
                            you
                          </span>
                        )}
                        <RoleChip role={m.role} />
                      </span>
                      <span className="block font-mono text-[10px] text-paper-300/70">
                        lv {m.level} · {m.xp.toLocaleString()} xp
                      </span>
                    </span>

                    {(canPromote || canKickTarget) && !menuOpen && (
                      <button
                        type="button"
                        aria-label={"Manage " + m.name}
                        onClick={() => {
                          setMenuFor(m.userId);
                          setConfirmKickFor(null);
                        }}
                        className="shrink-0 rounded-lg border border-paper-100/20 p-1.5 text-paper-300/70 transition hover:border-gold-400/60 hover:text-gold-300"
                      >
                        <UserCog className="h-4 w-4" aria-hidden />
                      </button>
                    )}

                    {menuOpen && (
                      <span className="flex shrink-0 items-center gap-1.5">
                        {canPromote && m.role !== "officer" && (
                          <button
                            type="button"
                            disabled={menuBusy}
                            onClick={() =>
                              runMenuAction(() => setRole({ userId: m.userId, officer: true }))
                            }
                            className="rounded-lg border border-sky-400/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-sky-300 transition hover:bg-sky-400/10 disabled:opacity-50"
                          >
                            promote
                          </button>
                        )}
                        {canPromote && m.role === "officer" && (
                          <button
                            type="button"
                            disabled={menuBusy}
                            onClick={() =>
                              runMenuAction(() => setRole({ userId: m.userId, officer: false }))
                            }
                            className="rounded-lg border border-paper-100/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-300 transition hover:bg-paper-100/5 disabled:opacity-50"
                          >
                            demote
                          </button>
                        )}
                        {canKickTarget && (
                          <button
                            type="button"
                            disabled={menuBusy}
                            onClick={() =>
                              kickPrimed
                                ? runMenuAction(() => kick({ userId: m.userId }))
                                : primeKick(m.userId)
                            }
                            className={
                              "rounded-lg border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition disabled:opacity-50 " +
                              (kickPrimed
                                ? "border-red-400 bg-red-400/15 text-red-300"
                                : "border-red-400/40 text-red-300/80 hover:bg-red-400/10")
                            }
                          >
                            {kickPrimed ? "sure?" : "kick"}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Close menu"
                          disabled={menuBusy}
                          onClick={() => {
                            setMenuFor(null);
                            setConfirmKickFor(null);
                          }}
                          className="font-mono text-[10px] uppercase tracking-widest text-paper-300/60 transition hover:text-paper-100"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </div>
          <ClanFeed />
        </div>

        {error && (
          <p className="relative mt-4 font-mono text-xs text-red-400">{error}</p>
        )}

        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <Link to="/learn" className="btn-gold !px-6 !py-2 text-sm">
            Add XP to the pool →
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Leave ${guild.name}? You keep your XP; the guild loses it.`)) return;
              setBusy(true);
              setError(null);
              try {
                await leave({});
              } catch (err) {
                setError(friendly(err));
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-full border border-paper-100/20 px-5 py-2 text-sm font-semibold text-paper-300 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
          >
            {busy ? "Leaving…" : "Leave guild"}
          </button>
        </div>
      </div>
    </Reveal>
  );
}

function CreateGuild() {
  const create = useMutation(api.clans.create);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [blurb, setBlurb] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create({ name, tag, blurb });
      setName("");
      setTag("");
      setBlurb("");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal className="mt-8">
      <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-7">
        <p className="eyebrow">free agent</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink-950">
          Found a guild, or join one below
        </h2>
        <p className="mt-2 max-w-lg text-sm text-ink-600">
          Up to 25 members each. Pool your XP, climb the guild board together, and
          unlock collective rewards from Company to Legend.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_140px]">
          <input
            className={inputCls}
            placeholder="Guild name — e.g. Nightly Builders"
            value={name}
            maxLength={28}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={inputCls + " uppercase"}
            placeholder="TAG"
            value={tag}
            maxLength={5}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            required
          />
          <input
            className={inputCls + " sm:col-span-2"}
            placeholder="Motto (optional) — what does your guild stand for?"
            value={blurb}
            maxLength={140}
            onChange={(e) => setBlurb(e.target.value)}
          />
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="btn-gold !px-6 !py-2 text-sm disabled:opacity-50"
            >
              {busy ? "Founding…" : "Found guild ⚑"}
            </button>
            <span className="font-mono text-[11px] text-ink-500">
              costs nothing · earns everything
            </span>
          </div>
        </form>
        {error && <p className="mt-3 font-mono text-xs text-red-600">{error}</p>}
      </div>
    </Reveal>
  );
}

/* ─────────────────────── Guild board ─────────────────────── */

function GuildBoard() {
  const guilds = useQuery(api.clans.list);
  const join = useMutation(api.clans.join);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  if (guilds === undefined) {
    return <div className="mt-8 h-64 animate-pulse rounded-2xl bg-paper-100/70" />;
  }

  return (
    <Reveal className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="eyebrow">guild board</h2>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-950">
            {guilds.length} guild{guilds.length === 1 ? "" : "s"} competing
          </p>
        </div>
      </div>

      {guilds.length === 0 ? (
        <div className="glass mt-5 rounded-2xl border border-dashed border-paper-300 p-8 text-center">
          <p className="text-3xl" aria-hidden>
            ⚑
          </p>
          <p className="mt-3 font-display text-lg font-semibold text-ink-950">
            No guilds yet
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Be the founder. The first banner on the board never gets forgotten.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3" style={{ perspective: "1200px" }}>
          {guilds.map((g, i) => (
            <motion.li
              key={g.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3), ease: EASE }}
            >
              <Tilt max={4} scale={1.005}>
                <div
                  className={
                    "glass glass-edge flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 " +
                    (g.isMine
                      ? "border-gold-400/70 shadow-glow"
                      : "border-paper-200/60")
                  }
                >
                  <span className="font-display text-2xl font-bold text-ink-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold-400/40 bg-ink-950 font-mono text-xs font-bold text-gold-300">
                    {g.tag}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-display text-lg font-semibold text-ink-950">
                        {g.name}
                      </span>
                      <span className="rounded-full border border-paper-200 bg-paper-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-gold-600">
                        {g.tier}
                      </span>
                      {g.isMine && (
                        <span className="rounded-full bg-ink-950 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-gold-300">
                          yours
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-600">{g.blurb}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {g.members.slice(0, 5).map((m, mi) => (
                        <RankFrame
                          key={m.name + mi}
                          name={m.name}
                          level={m.level}
                          ascension={m.ascension}
                          size="sm"
                        />
                      ))}
                      <span className="font-mono text-[10px] text-ink-500">
                        {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-base font-bold text-ink-950">
                      <span className="text-gold-500" aria-hidden>
                        ✦
                      </span>{" "}
                      {g.totalXp.toLocaleString()}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-500">
                      pooled xp
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                      +{g.weekXp.toLocaleString()} this week
                    </p>
                  </div>

                  {!g.isMine && (
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={async () => {
                        setPending(g.id);
                        setError(null);
                        try {
                          await join({ clanId: g.id });
                        } catch (err) {
                          setError(friendly(err));
                        } finally {
                          setPending(null);
                        }
                      }}
                      className="btn-ghost !px-5 !py-2 text-sm disabled:opacity-50"
                    >
                      {pending === g.id ? "Joining…" : "Join"}
                    </button>
                  )}
                </div>
              </Tilt>
            </motion.li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 font-mono text-xs text-red-600">{error}</p>}
    </Reveal>
  );
}

/* ─────────────────────── Rewards ladder ─────────────────────── */

function RewardsLadder() {
  const mine = useQuery(api.clans.mine);
  const totalXp = mine?.totalXp ?? 0;

  return (
    <Reveal className="mt-14">
      <h2 className="eyebrow mb-4">collective rewards</h2>
      <div className="grid gap-3 sm:grid-cols-5">
        {GUILD_TIERS.map((t, i) => {
          const unlocked = totalXp >= t.minXp;
          return (
            <motion.div
              key={t.id}
              className={
                "rounded-2xl border p-4 text-center transition " +
                (unlocked
                  ? "border-gold-400/60 bg-gold-400/10 shadow-glow"
                  : "border-paper-200/70 bg-paper-50/40")
              }
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
              whileHover={{ y: -4 }}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
                {t.minXp.toLocaleString()} xp
              </p>
              <p
                className={
                  "mt-2 font-display text-lg font-semibold " +
                  (unlocked ? "text-ink-950" : "text-ink-400")
                }
              >
                {t.name}
              </p>
              <p className="mt-2 text-xs leading-snug text-ink-600">{t.perk}</p>
              <p
                className={
                  "mt-3 font-mono text-[10px] uppercase tracking-widest " +
                  (unlocked ? "text-gold-600" : "text-ink-400")
                }
              >
                {unlocked ? "unlocked" : "locked"}
              </p>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-4 font-mono text-[11px] text-ink-500">
        Guild tier is the sum of every member's all-time XP
        {totalXp > 0 ? ` — yours sits at ${totalXp.toLocaleString()}` : ""}.
      </p>
    </Reveal>
  );
}
