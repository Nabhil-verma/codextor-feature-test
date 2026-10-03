import type { Track } from "./types";

export const architectureTrack: Track = {
  id: "architecture",
  title: "System Design & Architecture",
  blurb: "Scale, cache, shard, and queue — the trade-off thinking behind big systems.",
  numeral: "Ⅹ",
  optional: true,
  optionalWhy:
    "System-design vocabulary rather than daily work. High value for interviews that ask design questions; a reading-heavy track otherwise.",
  lessons: [
    {
      id: "monolith-vs-microservices",
      title: "Monoliths vs. Microservices",
      minutes: 11,
      reading: true,
      body: `**Every system starts as a monolith** — one deployable app holding all the code. That's not a sin; it's the correct default. One repo, one deploy, one log file, function calls instead of network calls. Instagram served tens of millions of users on a monolith.

**The monolith's breaking points:**
- deploys become scary — one shared codebase means one bad change blocks everyone
- scaling is all-or-nothing — need more image-resizing capacity? You scale *everything*
- a memory leak in one feature can take down the whole process

**Microservices split the system along business lines** — each service owns its data, deploys independently, and talks to the others over the network:

\`\`\`
        ┌────────────┐
        │   gateway  │
        └─────┬──────┘
   ┌──────────┼──────────┐
┌──┴───┐  ┌───┴──┐  ┌────┴───┐
│users │  │orders│  │ emails │      each with its own DB
└──────┘  └──────┘  └────────┘
\`\`\`

**What you buy:** independent deploys (small blast radius), independent scaling (scale only the hot service), tech freedom per service, team ownership boundaries.

**What you pay — and it's steep:**
- every function call becomes a network call: latency, retries, timeouts, partial failure
- distributed transactions are gone — you get eventual consistency instead
- distributed tracing, service discovery, and deployment tooling become mandatory
- debugging spans machines; "the bug" now lives in the seams

**The honest rule of thumb:** start with a modular monolith — one deploy, but with strict internal module boundaries. Extract a service only when a specific force (scaling, team size, deploy contention) demands it. *You can't understand microservices until you've felt the pain microservices solve — and you can't feel it until you've built a monolith.*

**Trade-off analysis framework** for any architecture question:
1. What does the traffic look like? (read-heavy? spiky? latency-sensitive?)
2. What must be strongly consistent vs. eventually consistent?
3. Where is the team's bottleneck — people or machines?
4. What's the simplest design that survives failure of ONE component?`,
      quiz: [
        {
          q: "The correct default for a new product is usually:",
          options: [
            "A microservice per feature, ready for scale",
            "A modular monolith — one deploy with strict internal boundaries",
            "No architecture at all",
            "Serverless functions only",
          ],
          answer: 1,
          explanation:
            "Function calls beat network calls on cost, latency, and debugging until real forces demand extraction.",
        },
        {
          q: "The biggest tax microservices introduce is:",
          options: [
            "Slower CPUs",
            "Network calls replace function calls — latency, retries, and partial failure everywhere",
            "Larger repositories",
            "Inability to use databases",
          ],
          answer: 1,
          explanation:
            "Distributed systems trade call reliability for deploy independence — that's the deal.",
        },
        {
          q: "In microservices, each service typically:",
          options: [
            "Shares one giant database for consistency",
            "Owns its data store and exposes it via an API",
            "Runs on the same process",
            "Must use the same language",
          ],
          answer: 1,
          explanation:
            "Shared databases couple services as tightly as shared code — the data boundary IS the service boundary.",
        },
        {
          q: "A good reason to extract a service:",
          options: [
            "Microservices look good on a résumé",
            "One module has wildly different scaling needs or blocks others' deploys",
            "The codebase feels big",
            "A consultant recommended it",
          ],
          answer: 1,
          explanation:
            "Extract on concrete forces: scaling hotspots, deploy contention, team ownership — never on aesthetics.",
        },
        {
          q: "'Eventual consistency' means:",
          options: [
            "The database is eventually fast",
            "Replicas converge to the same value after a delay — reads may briefly disagree",
            "Writes are queued forever",
            "Transactions are impossible",
          ],
          answer: 1,
          explanation:
            "Cross-service writes commit independently; the system guarantees convergence, not instant agreement.",
        },
      ],
    },
    {
      id: "caching-and-redis",
      title: "Caching & Redis (with an LRU exercise)",
      minutes: 14,
      body: `**Caching is the one scaling lever that shows up in every system design.** The insight: data is usually *requested* far more often than it *changes* — so keep the hot answers close.

**The layers, from the user inward:**
\`\`\`
browser cache  →  CDN  →  app-level cache (Redis)  →  database
\`\`\`
Each hop is faster and more expensive to invalidate. The database is always the last resort.

**Redis in one paragraph:** an in-memory data store — sub-millisecond reads — with strings, hashes, lists, sets, and sorted sets, plus TTLs. Typical jobs: caching DB queries, storing sessions, rate-limit counters, leaderboards (sorted sets!), and pub/sub.

**The cache patterns you must name:**

\`\`\`
Cache-aside (the default):
  read:  cache hit?  return it
         cache miss? read DB → store in cache → return
  write: write DB → invalidate the cache key

Write-through:
  write: write cache AND DB together
  reads are always warm; writes are slower

TTL on everything:
  every key gets an expiry — the safety net when invalidation logic has a bug
\`\`\`

**Cache-aside's classic problems:**
- **Stale reads** — data changed but the cache wasn't invalidated. Mitigate with short TTLs or event-driven invalidation.
- **The thundering herd** — a hot key expires and a thousand requests hit the DB at once. Mitigate with jittered TTLs or request coalescing.
- **Penetrating queries** — requests for keys that *never* exist (attackers love these) skip the cache and slam the DB. Cache the empty result briefly, or bloom-filter.

**What belongs in a cache:** expensive, mostly-stable, read-heavy results. **What doesn't:** anything where a stale answer costs money (balances, inventory at checkout) or personal data with hard privacy rules.

This lesson's exercise: build an **LRU cache** — the data structure behind every real cache's memory limit — with O(1) get and put. Hash map for lookup, doubly-linked list for recency order. It's also a top-5 interview question.`, 
      starter: `// Build an LRU cache — O(1) get & set.
// A Map in JS preserves insertion order, so "oldest = first key".
// On every ACCESS, delete + re-set the key to mark it most-recent.
// When over capacity, evict the FIRST key (the least recently used).

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    // TODO: refresh recency — delete the key, re-set it with the value
    return value;
  }
  put(key, value) {
    // TODO: if the key exists, delete it first (so re-set moves it to the end)
    // then set it; if size > capacity, evict the FIRST key:
    //   const oldest = this.map.keys().next().value;
    //   this.map.delete(oldest);
  }
  keys() {
    return [...this.map.keys()];
  }
}

const c = new LRUCache(2);
c.put("a", 1);
c.put("b", 2);
console.log("get a (hit):", c.get("a"));       // 1
c.put("c", 3);                                  // evicts the LRU: "b"
console.log("get b (evicted):", c.get("b"));   // -1
console.log("order is now:", c.keys().join(",")); // a,c
c.get("a");                                     // touch a → a becomes MRU
c.put("d", 4);                                  // evicts "c"
console.log("get c (evicted):", c.get("c"));   // -1
console.log("order is now:", c.keys().join(",")); // a,d
console.log("final size (must be 2):", c.keys().length);`,
      check: {
        expr:
          "output.includes('get a (hit): 1') && output.includes('get b (evicted): -1') && output.includes('order is now: a,c') && output.includes('get c (evicted): -1') && output.includes('order is now: a,d') && output.includes('final size (must be 2): 2')",
        hint:
          "get: if missing return -1, else delete(key) then set(key, value) and return it. put: delete existing key first, set it, then while map.size > capacity delete the first key.",
      },
      quiz: [
        {
          q: "The default cache pattern — read cache, fall back to DB, backfill — is called:",
          options: ["Write-through", "Cache-aside", "Read-repair", "Write-behind"],
          answer: 1,
          explanation:
            "Cache-aside keeps the DB the source of truth and treats the cache as a disposable accelerator.",
        },
        {
          q: "After writing new data, cache-aside usually:",
          options: [
            "Rewrites the whole cache",
            "Invalidates the affected key so the next read repopulates it",
            "Doubles the TTL",
            "Writes to a second database",
          ],
          answer: 1,
          explanation:
            "Invalidate, don't update: the next read fetches fresh data and re-fills the key.",
        },
        {
          q: "A TTL exists to:",
          options: [
            "Make the cache faster",
            "Bound staleness — keys expire so old data can't live forever",
            "Compress values",
            "Count requests",
          ],
          answer: 1,
          explanation:
            "Even perfect invalidation code gets a TTL safety net; the two mechanisms cover each other.",
        },
        {
          q: "A hot key expires and thousands of requests hit the DB simultaneously. That's:",
          options: [
            "The thundering herd — mitigate with jittered TTLs or request coalescing",
            "A cache hit",
            "Write amplification",
            "Sharding",
          ],
          answer: 0,
          explanation:
            "Jitter spreads expirations out; coalescing lets one flight repopulate for everyone.",
        },
        {
          q: "Why does the LRU exercise use delete + re-set on every access?",
          options: [
            "It looks cleaner",
            "JS Maps keep insertion order — re-inserting moves the key to the 'most recent' end in O(1)",
            "It compresses values",
            "Maps don't allow updates",
          ],
          answer: 1,
          explanation:
            "Insertion order IS the recency order — the trick that makes LRU O(1) without a hand-rolled linked list.",
        },
      ],
    },
    {
      id: "load-balancing",
      title: "Load Balancing & Horizontal Scaling",
      minutes: 10,
      reading: true,
      predict: [
        {
          prompt: "Round-robin over 3 servers — which requests hit server B?",
          code: `const servers = ["A", "B", "C"];
let i = 0;
function pick() {
  const s = servers[i % servers.length];
  i = i + 1;
  return s;
}
console.log([1,2,3,4,5,6].map(pick).join(""));`,
          options: ["ABCABС — wait, that's every position 2 and 5", "B and E only — positions 2 and 5", "BB", "All hit B"],
          answer: 1,
          explanation:
            "i%3 cycles 0,1,2 — B serves requests 2 and 5. (Careful with look-alike characters in options — another reason to always verify by running!)",
        },
      ],
      body: `**Vertical scaling** buys a bigger box. **Horizontal scaling** buys more boxes — and the moment you have more than one, something must decide who gets each request. That's the load balancer.

\`\`\`
                    ┌── server 1
client → LB (VIP) ──┼── server 2
                    └── server 3
\`\`\`

**Strategies:**
- **Round robin** — rotate through the list. Simple, fair for identical requests.
- **Least connections** — send work to whoever is least busy. Better when request durations vary wildly.
- **Consistent hashing** — hash the request key (user id, session) onto a ring of servers so the same key lands on the same server — crucial when servers hold state (sticky sessions, caches). Its magic: adding/removing a server moves only ~1/N of the keys, not all of them.
- **Weighted** — beefier machines take proportionally more traffic during a migration.

**The prerequisite for any of this: your servers must be stateless.** No sessions in local memory, no files on local disk. State goes to Redis/a database/object storage. Then any server can serve any request, and a dead one loses nothing.

**Health checks are what make an LB an LB:** it probes each backend (say, \`GET /health\`) and routes around failures automatically. Combined with autoscaling (add instances above a CPU/queue threshold, remove below it), you get a fleet that heals and breathes on its own.

**Where LBs live:** a hardware/virtual appliance (nginx, HAProxy, cloud LBs), or DNS-level (multiple A records — cruder, slower to fail over). Most production stacks use a managed cloud LB in front of an autoscaling group.`,
      quiz: [
        {
          q: "Horizontal scaling requires servers to be:",
          options: [
            "Written in Go",
            "Stateless — any instance can serve any request",
            "Physically adjacent",
            "Single-threaded",
          ],
          answer: 1,
          explanation:
            "State in Redis/DB/object storage; instances become interchangeable cattle, not pets.",
        },
        {
          q: "Least-connections beats round-robin when:",
          options: [
            "Servers are identical",
            "Request durations vary a lot — some requests hog a server for seconds",
            "There's only one server",
            "Traffic is constant",
          ],
          answer: 1,
          explanation:
            "Round robin assumes uniform cost; least connections routes around slow in-flight requests.",
        },
        {
          q: "Consistent hashing's key property:",
          options: [
            "It's faster than modulo",
            "Adding/removing a server remaps only ~1/N of keys, not everything",
            "It encrypts traffic",
            "It only works with 2 servers",
          ],
          answer: 1,
          explanation:
            "The hash ring keeps most key→server assignments stable across topology changes — why caches and shards love it.",
        },
        {
          q: "Health checks let the load balancer:",
          options: [
            "Encrypt requests",
            "Automatically stop routing to failed backends",
            "Store sessions",
            "Compress responses",
          ],
          answer: 1,
          explanation:
            "Probe /health, eject the dead — the mechanism behind self-healing fleets.",
        },
        {
          q: "Sticky sessions are usually a smell because:",
          options: [
            "They're slower to configure",
            "They bind users to one server — killing the stateless property horizontal scaling needs",
            "Cookies are deprecated",
            "LBs can't support them",
          ],
          answer: 1,
          explanation:
            "Prefer server-side shared state; stickiness only as a legacy-system crutch.",
        },
      ],
    },
    {
      id: "websockets-realtime",
      title: "WebSockets & Real-Time Systems",
      minutes: 10,
      reading: true,
      body: `HTTP is a **request–response** protocol: the client asks, the server answers, the connection ends. Fine for pages. Terrible for *live* data — a chat app polling every second is a thousand wasted requests per user per minute, plus up-to-a-second latency.

**WebSockets upgrade one HTTP connection into a persistent, bidirectional pipe:**

\`\`\`
GET /chat HTTP/1.1
Upgrade: websocket
Connection: Upgrade

…101 Switching Protocols…

server ⇄ client    (either side can push, instantly, for as long as it stays open)
\`\`\`

**The model shift:** the server no longer waits to be asked — it *pushes*. That's what powers chat, collaborative editing, live dashboards, multiplayer games, and trading UIs.

**Scaling WebSockets is the interesting part.** A connection is state that lives on ONE server — the exact thing horizontal scaling hates. 10,000 concurrent connections spread over 10 servers: when Ada (on server 2) sends a message meant for Sam (on server 7), server 2 can't just "send it to everyone".

\`\`\`
The standard solution — a pub/sub backbone:

server 1 ─┐
server 2 ─┼── Redis pub/sub (or Kafka) ── every server subscribes
server 3 ─┘

Ada's message → server 2 publishes to "chat:room1"
               → Redis fans out to all subscribed servers
               → whichever server holds Sam's socket delivers it
\`\`\`

**Production realities:**
- **Heartbeats** — dead connections are invisible; ping/pong every ~30s detects them
- **Reconnection with backoff** — mobile networks drop constantly; clients must retry (1s, 2s, 4s…) and re-sync missed state
- **Fan-out cost** — a message to a 50k-member room is 50k sends; that's where queueing and batching earn their keep
- Alternatives: **SSE** (server→client only, dead simple, auto-reconnects) for one-way feeds, and managed services (Pusher/Ably/Firebase) when running socket infrastructure isn't your product`,
      quiz: [
        {
          q: "Compared to HTTP polling, WebSockets give you:",
          options: [
            "Faster DNS",
            "A persistent bidirectional connection — push instead of repeated ask",
            "Better SEO",
            "Free scaling",
          ],
          answer: 1,
          explanation:
            "One upgrade handshake, then either side pushes instantly — no request overhead per message.",
        },
        {
          q: "Why is a WebSocket hard to load-balance naively?",
          options: [
            "It uses UDP",
            "The connection is long-lived state bound to one server",
            "Browsers forbid it",
            "It can't be encrypted",
          ],
          answer: 1,
          explanation:
            "Sam's socket lives on server 7 — requests can't just round-robin anymore.",
        },
        {
          q: "The standard scaling backbone for socket servers is:",
          options: [
            "A bigger server",
            "A pub/sub layer (Redis/Kafka) that fans messages out to every server",
            "DNS round robin",
            "Client-side routing",
          ],
          answer: 1,
          explanation:
            "Publish once; every server receives and delivers to the sockets it holds.",
        },
        {
          q: "Heartbeats (ping/pong) exist because:",
          options: [
            "They speed up messages",
            "Dead TCP connections look alive — you must detect and clean them up",
            "TLS requires them",
            "Browsers send them automatically",
          ],
          answer: 1,
          explanation:
            "Without pings, half-open connections accumulate and 'online users' is a lie.",
        },
        {
          q: "A one-way server→client feed (notifications, tickers) can use — simpler than WebSockets:",
          options: ["FTP", "Server-Sent Events (SSE)", "SSH", "SMTP"],
          answer: 1,
          explanation:
            "SSE is plain HTTP, auto-reconnects, and covers the server-push-only case.",
        },
      ],
    },
    {
      id: "sharding-and-queues",
      title: "Database Sharding & Message Queues",
      minutes: 11,
      reading: true,
      predict: [
        {
          prompt: "Sharding by user_id % 4 — where does user 7's data live, and why is this scheme brittle?",
          code: `function shard(userId, count) {
  return userId % count;
}
console.log("user 7 → shard", shard(7, 4));
console.log("add a shard (5) and user 7 lands on:", shard(7, 5));`,
          options: [
            "user 7 → shard 3; with 5 shards it's still 3 — nothing moves",
            "user 7 → shard 3; add a shard and it moves to 2 — almost every key remaps",
            "user 7 → shard 0 always",
            "Sharding changes the data, not the location",
          ],
          answer: 1,
          explanation:
            "Naive modulo remaps nearly everything when the shard count changes — consistent hashing or a lookup tier fixes this.",
        },
      ],
      body: `**One PostgreSQL box tops out** — connections, RAM, disk IOPS. Replication adds read capacity but every write still hits the primary. When writes are the bottleneck, you **shard**: split the data across independent databases, each owning a slice.

\`\`\`
                  ┌─ shard 0: users where hash(id) % 4 = 0
app → router/tier ┼─ shard 1: hash % 4 = 1
                  ├─ shard 2: hash % 4 = 2
                  └─ shard 3: hash % 4 = 3
\`\`\`

**Shard key choice is the whole game:**
- **By user id** — all of one user's data co-located; queries without the user id (admin dashboards) must fan out to every shard
- **By tenant** — great for B2B, terrible if one customer is a whale (hot shard)
- **By hash of the key** — even distribution, but range queries die

**What you lose the moment you shard:** cross-shard joins, global unique constraints, and single-node transactions. Resharding (moving data when you outgrow N shards) is one of the most painful operations in the industry — which is why consistent hashing or directory-based routing exists, and why teams defer sharding until *proven* to need it.

**Message queues solve a different axis: coupling over time.** Instead of service A calling service B synchronously (B must be up, fast, and A must wait), A *publishes an event* and gets on with life:

\`\`\`
checkout service ──publish "order.placed"──▶ [ RabbitMQ / Kafka ]
                                                   │
                     ┌─────────────┬───────────────┼──────────┐
                 email worker  invoice worker  analytics   fraud check
\`\`\`

**What the queue buys:**
- **Decoupling** — add a consumer without touching the publisher
- **Buffering** — a 10× traffic spike queues up instead of melting downstream services
- **Retry & dead-letter** — a failed email job retries; after N failures it goes to a dead-letter queue for humans
- **Independent scaling** — run 30 email workers, 2 invoice workers

**The trade:** everything becomes eventually consistent ("your order is confirmed" while the invoice hasn't run yet), and you need idempotent consumers — the same message may be delivered more than once. At-least-once delivery is the norm; design for duplicates, not against them.`,
      quiz: [
        {
          q: "Sharding differs from replication because sharding:",
          options: [
            "Adds read replicas",
            "Splits DIFFERENT rows across different databases",
            "Compresses the database",
            "Is only for MongoDB",
          ],
          answer: 1,
          explanation:
            "Replicas hold copies for reads; shards hold partitions for write scale.",
        },
        {
          q: "The single most important sharding decision:",
          options: [
            "Database engine version",
            "The shard key — it fixes which data lives together and which queries fan out",
            "Disk brand",
            "Programming language",
          ],
          answer: 1,
          explanation:
            "A bad shard key creates hot shards and cross-shard queries; changing it later means migrating everything.",
        },
        {
          q: "Naive `id % N` sharding is brittle because:",
          options: [
            "Modulo is slow",
            "Changing N remaps nearly every key — a full-data migration",
            "It requires SQL",
            "It leaks PII",
          ],
          answer: 1,
          explanation:
            "Consistent hashing moves only ~1/N of keys when the topology changes.",
        },
        {
          q: "A message queue decouples services in:",
          options: [
            "Space only",
            "Time — the producer doesn't wait, consumers process later, independently",
            "Encryption strength",
            "Neither — it's just faster HTTP",
          ],
          answer: 1,
          explanation:
            "Publish-and-forget: producers survive consumer outages and spikes are buffered.",
        },
        {
          q: "Why must queue consumers be idempotent?",
          options: [
            "It's a style rule",
            "Delivery is at-least-once — duplicates happen, and processing one twice must be harmless",
            "Queues delete old messages",
            "Consumers are single-threaded",
          ],
          answer: 1,
          explanation:
            "Exactly-once is a myth in practice; idempotency (upserts, dedupe keys) makes duplicates safe.",
        },
      ],
    },
    {
      id: "capstone-system-design",
      title: "Capstone: Design a URL Shortener (in code)",
      minutes: 16,
      body: `Interviews and real life both test the same skill: turning a vague product into a concrete design, then defending the trade-offs. You'll do it here for real — a **URL shortener** like bit.ly, and you'll implement its heart.

**Step 1 — requirements, made explicit:**
\`\`\`
shorten(longUrl) → short code         (write-heavy at creation)
resolve(code)    → longUrl            (read-heavy: ~100:1 vs writes)
codes are permanent, redirects return 301/302
\`\`\`

**Step 2 — the ID question, the crux of the design.** Don't hash the URL (collisions + the same URL wastes a slot). **Count and encode**: every new URL gets an auto-increment ID; encode it in **base62** (\`0-9, a-z, A-Z\` — 62 digits). ID 125 → \`"cb"\`. 62² = 3,844 URLs in two characters; six characters covers ~56 *billion*.

\`\`\`
125 → base62 → "cb"     decode("cb") → 125 → SELECT url FROM links WHERE id=125
\`\`\`

**Step 3 — the pieces around it:**
- **Cache** the hot codes in Redis (cache-aside) — reads dominate 100:1
- **A 301** tells browsers "permanent — cache the redirect"; a **302** keeps analytics flowing. Trade-off, not rule.
- **Analytics** go to a queue (async), never inline in the redirect path
- **Custom aliases** = a uniqueness check on insert; the encode scheme stays untouched

**The same skeleton solves real-time chat** (rooms = keys, message fan-out via pub/sub), **pastebin** (content = the value), **rate limiter** (counters in Redis) — that's why interviewers love it: it's a *pattern*, not a puzzle.

**Your exercise:** implement base62 encode + decode, prove they round-trip, and build the tiny in-memory store with a cache in front. Getting \`encode(decode(x)) === x\` for a hundred thousand IDs is the acceptance test.`,
      starter: `// ─── The heart of bit.ly: base62 IDs ─────────────────
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encode(id) {
  // TODO: repeatedly take id % 62 for the next digit (right to left),
  // then integer-divide by 62; join the characters.
  // encode(0) must be "0". encode(125) must be "2V"... check ALPHABET[2]="2", ALPHABET[38]="V"
  return "";
}

function decode(code) {
  // TODO: for each character: id = id * 62 + ALPHABET.indexOf(char)
  return 0;
}

// ─── Round-trip proof: the acceptance test ───────────
let bad = 0;
for (let id = 0; id < 100_000; id++) {
  if (decode(encode(id)) !== id) bad++;
  if (bad > 3) break;
}
console.log("round-trip failures:", bad);            // 0
console.log("encode(125):", encode(125));            // 2V
console.log("decode('2V'):", decode("2V"));          // 125
console.log("encode(61):", encode(61));              // Z

// ─── The store + cache, wired up ─────────────────────
const store = new Map();            // id → url  (stand-in for the DB)
const cache = new Map();            // code → url (stand-in for Redis)
let dbReads = 0;
function saveUrl(url) {
  const id = store.size;
  store.set(id, url);
  return encode(id);
}
function resolveUrl(code) {
  if (cache.has(code)) return cache.get(code);
  dbReads++;
  const url = store.get(decode(code));
  cache.set(code, url);
  return url;
}
const short = saveUrl("https://example.com/very/long/path");
console.log("short code:", short);
console.log("first read (DB hit):", resolveUrl(short));
console.log("second read (cached):", resolveUrl(short));
console.log("db reads for 2 resolves:", dbReads);   // 1`,
      check: {
        expr:
          "output.includes('round-trip failures: 0') && output.includes('encode(125): 2V') && output.includes(\"decode('2V'): 125\") && output.includes('encode(61): Z') && output.includes('db reads for 2 resolves: 1')",
        hint:
          "encode: while (id > 0) { out = ALPHABET[id % 62] + out; id = Math.floor(id / 62); } — guard id === 0 → '0'. decode: for each char, id = id * 62 + ALPHABET.indexOf(ch).",
      },
      quiz: [
        {
          q: "Why encode auto-increment IDs instead of hashing the URL?",
          options: [
            "Hashing is slower to compute",
            "Sequential IDs are collision-free and dense — base62 codes stay short and deterministic",
            "Hashes are not secure",
            "Databases require numeric keys",
          ],
          answer: 1,
          explanation:
            "Hash collisions force collision-handling; counter+encode gives every URL a unique, short code for free.",
        },
        {
          q: "Base62 (not base64) is used for short codes because:",
          options: [
            "It's shorter per character",
            "It's URL-safe — no +, /, or = that need escaping",
            "62 is a power of two",
            "Databases only sort lowercase",
          ],
          answer: 1,
          explanation:
            "Alphanumeric-only codes survive URLs, QR codes, and humans reading them aloud.",
        },
        {
          q: "A 301 redirect instead of 302:",
          options: [
            "Is always correct",
            "Tells browsers to cache permanently — faster, but you lose per-click analytics",
            "Is required by base62",
            "Hides the long URL",
          ],
          answer: 1,
          explanation:
            "301 = permanent (browser caches, your analytics go dark); 302 = temporary (every click hits you). Know which you're choosing.",
        },
        {
          q: "Click analytics should be recorded:",
          options: [
            "Inline inside the redirect handler",
            "Asynchronously via a queue, keeping the redirect path fast",
            "In localStorage",
            "Never",
          ],
          answer: 1,
          explanation:
            "The hot path does one thing: redirect. Everything else streams out through a queue.",
        },
        {
          q: "The Redis cache in front of code→URL lookups pays off because:",
          options: [
            "URLs are small",
            "Reads outnumber writes ~100:1 — caching hot codes removes nearly all DB load",
            "Redis is ACID",
            "Codes are numeric",
          ],
          answer: 1,
          explanation:
            "Read-heavy + stable data = the textbook cache candidate, at the exact layer interviewers expect.",
        },
      ],
    },
  ],
};
