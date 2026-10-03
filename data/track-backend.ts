import type { Track } from "./types";

export const backendTrack: Track = {
  id: "backend",
  title: "Backend Systems & APIs",
  blurb: "Node.js, Express, REST design, auth, and databases that don't fall over.",
  numeral: "Ⅲ",
  lessons: [
    {
      id: "node-event-loop",
      title: "Node.js & the Event Loop",
      minutes: 10,
      body: `Node.js is a single JavaScript thread that never waits. Its power comes from **non-blocking I/O**: ask for a file/database/network response, hand over a *callback*, and keep serving other requests while the OS works.

\`\`\`
// blocking — the whole server stalls 2s per call
const data = fs.readFileSync("big.json");

// non-blocking — the thread stays free
fs.readFile("big.json", (err, data) => { … });
\`\`\`

**The event loop** is the scheduler that makes this possible. Each loop iteration (tick) runs phases in order — timers (\`setTimeout\`) → pending callbacks → **poll** (I/O events) → check (\`setImmediate\`) → close — and *only then* the **microtask queue**: promise callbacks (\`.then\`, \`await\` continuations) drain after each macrotask, before the next one starts.

\`\`\`
console.log("1 sync");
setTimeout(() => console.log("4 timeout"), 0);
Promise.resolve().then(() => console.log("3 promise"));
console.log("2 sync");
// order: 1, 2, 3, 4 — microtasks beat timers
\`\`\`

**Why your server dies:** one blocking call (a huge loop, sync file I/O, an expensive regex) freezes *every* client. Rule: never block the thread. Offload CPU-heavy work to worker threads.

Run this — predict the order *before* pressing Run.`,
      starter: `console.log("1: sync code runs first");

setTimeout(() => {
  console.log("5: timeout (macrotask)");
}, 0);

Promise.resolve().then(() => {
  console.log("4: promise (microtask — before timers!)");
});

queueMicrotask(() => console.log("3: queueMicrotask (microtask)"));

for (let i = 0; i < 3; i++) {
  console.log("2: sync loop pass", i);
}

console.log("done scheduling — event loop takes over");`,
      check: {
        expr: "output.includes('4: promise') && output.includes('5: timeout') && output.indexOf('4: promise') < output.indexOf('5: timeout')",
        hint: "Microtasks (promises) must print BEFORE the timeout — if not, check your understanding of the loop.",
      },
      predict: [
        {
          prompt: "In what order do these lines print in Node?",
          code: `console.log("1: sync");
setTimeout(() => console.log("2: timeout"), 0);
Promise.resolve().then(() => console.log("3: promise"));
console.log("4: sync");`,
          options: [
            "1, 2, 3, 4 — setTimeout(0) runs immediately after",
            "1, 4, 3, 2 — sync code, then microtasks (promises), then macrotasks (timers)",
            "1, 4, 2, 3 — timers always beat promises",
            "1, 3, 4, 2",
          ],
          answer: 1,
          explanation:
            "The event loop drains ALL microtasks (promise callbacks) after the sync stack finishes, before touching the timer queue. This exact ordering question shows up in half of all Node interviews.",
        },
        {
          prompt: "What does this middleware chain print when a request arrives?",
          code: `// a 10-line model of Express middleware
const stack = [];
const app = {
  use(fn) { stack.push(fn); },
  handle() {
    let i = 0;
    const next = () => { if (i < stack.length) stack[i++](next); };
    next();
  },
};
app.use((next) => { console.log("A"); next(); console.log("B"); });
app.use((next) => { console.log("C"); next(); });
app.handle();`,
          options: ["A C B — the stack unwinds after next()", "A B C", "A C", "C A B"],
          answer: 0,
          explanation:
            "Middleware is an onion: A runs, next() descends to C, and when the inner layer returns, B runs on the way back out. That's why timing code goes AFTER next() — it measures the whole inner stack.",
        },
      ],
      quiz: [
        {
          q: "Node's default model is…",
          options: [
            "One thread per request",
            "A single thread with non-blocking I/O",
            "Threads with shared memory",
            "Blocking until each request finishes",
          ],
          answer: 1,
          explanation:
            "The event loop multiplexes thousands of concurrent connections on one thread.",
        },
        {
          q: "Promise callbacks (microtasks) run…",
          options: [
            "After all timers",
            "After the current macrotask, before the next one",
            "In the next frame",
            "Immediately, skipping the queue",
          ],
          answer: 1,
          explanation:
            "Microtasks drain completely between macrotasks — that's why 3 beats 4.",
        },
        {
          q: "Which blocks the event loop?",
          options: [
            "await fetch(...)",
            "A 5-second while loop",
            "setTimeout(..., 5000)",
            "Reading a file with a callback",
          ],
          answer: 1,
          explanation:
            "Only synchronous CPU work blocks; async I/O yields to the loop.",
        },
        {
          q: "fs.readFileSync in a request handler causes…",
          options: [
            "Faster reads",
            "Every other request to stall until the read finishes",
            "A syntax error",
            "Automatic parallelism",
          ],
          answer: 1,
          explanation:
            "Sync I/O holds the thread hostage — the cardinal sin of Node servers.",
        },
        {
          q: "setImmediate callbacks run…",
          options: [
            "Before promises",
            "In the check phase, after I/O polling",
            "Only in browsers",
            "Before sync code",
          ],
          answer: 1,
          explanation:
            "setImmediate schedules for the check phase; setTimeout(0) lands in the timers phase of a later tick.",
        },
      ],
    },
    {
      id: "express-middleware",
      title: "Express & the Middleware Pipeline",
      minutes: 10,
      sort: {
        prompt: "Order the request as it flows down the middleware pipeline.",
        items: [
          "logger middleware logs the request",
          "express.json() parses the body into req.body",
          "auth middleware attaches req.user or rejects",
          "the route handler builds the response",
          "error middleware catches whatever threw",
        ],
        explanation:
          "Order is everything: parse before you read the body, authenticate before you trust the caller, and register error handlers last so they catch failures from everything above.",
      },
      body: `Express is a **pipeline**: each request flows through middleware — functions with \`(req, res, next)\` — until one responds.

\`\`\`
app.use(logger);              // 1. every request gets logged
app.use(express.json());      // 2. JSON bodies parsed into req.body
app.use(auth);                // 3. attaches req.user or rejects

app.get("/api/users", listUsers);   // 4. route handlers last
\`\`\`

Order is everything — middleware runs **top to bottom**. \`next()\` passes control forward; responding ends the flow. Forgetting \`next()\` or a response = the request hangs.

\`\`\`
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  req.user = verify(token);   // enrich the request
  next();                     // continue down the pipeline
}
\`\`\`

**A REST route is just a route + verbs:**

\`\`\`
app.get("/api/todos", handler);          // list
app.post("/api/todos", handler);         // create
app.put("/api/todos/:id", handler);      // replace
app.patch("/api/todos/:id", handler);    // partial update
app.delete("/api/todos/:id", handler);   // destroy

app.get("/api/todos/:id", (req, res) => {
  const todo = db.find(req.params.id);
  if (!todo) return res.status(404).json({ error: "not found" });
  res.status(200).json(todo);
});
\`\`\`

Below: a tiny middleware pipeline simulator — watch a request flow through.`,
      starter: `// Mini Express: middleware pipeline in 15 lines
function createApp() {
  const stack = [];
  return {
    use(fn) { stack.push(fn); },
    handle(req) {
      const log = [];
      let i = 0;
      const res = { status: (s) => { log.push("→ respond " + s); } };
      const next = () => {
        const fn = stack[i++];
        if (!fn) { log.push("→ 404 (fell off the pipeline)"); return; }
        fn(req, res, next);
      };
      next();
      return log.join("\\n");
    },
  };
}

const app = createApp();
app.use((req, res, next) => { console.log("1. logger: " + req.method + " " + req.url); next(); });
app.use((req, res, next) => { console.log("2. auth: token=" + (req.token ? "ok" : "missing")); next(); });
app.use((req, res, next) => { if (!req.token) { console.log("3. guard rejects"); return res.status(401); } next(); });
app.use((req, res) => { console.log("4. handler reached"); res.status(200); });

console.log("--- request WITHOUT token ---");
console.log(app.handle({ method: "GET", url: "/api/todos" }));
console.log("--- request WITH token ---");
console.log(app.handle({ method: "GET", url: "/api/todos", token: "abc123" }));`,
      check: {
        expr: "output.includes('guard rejects') && output.includes('4. handler reached')",
        hint: "The guard must reject the token-less request (401) and let the tokened request reach the handler.",
      },
      quiz: [
        {
          q: "Middleware runs…",
          options: ["In random order", "In the order it was registered", "Parallel", "On demand only"],
          answer: 1,
          explanation: "The stack is a queue — registration order is execution order.",
        },
        {
          q: "If middleware never calls next() or responds, the request…",
          options: ["Retries", "Hangs forever", "Gets 500", "Skips to the router"],
          answer: 1,
          explanation: "Nothing continues the pipeline — the client waits until timeout.",
        },
        {
          q: "req.body is undefined before express.json() because…",
          options: [
            "Express is broken",
            "The body-parsing middleware hasn't run yet in the pipeline",
            "Bodies never parse",
            "It only works in POST",
          ],
          answer: 1,
          explanation:
            "Parsing is middleware — it must be registered before the routes that need it.",
        },
        {
          q: "req.params.id in '/api/todos/:id' holds…",
          options: ["The query string", "The :id path segment", "The whole URL", "The request body"],
          answer: 1,
          explanation: "Named route segments become req.params keys.",
        },
        {
          q: "Correct REST mapping for 'update one todo partially'?",
          options: ["POST /todos", "PATCH /todos/:id", "GET /todos/:id/edit", "PUT /todos"],
          answer: 1,
          explanation: "PATCH = partial update of a specific resource.",
        },
      ],
    },
    {
      id: "rest-auth",
      title: "REST Design, Hashing & JWT",
      minutes: 12,
      reading: true,
      body: `**REST in one sentence:** URLs are *nouns* (resources), HTTP verbs are the actions, status codes are the verdict.

\`\`\`
GET    /api/articles        → 200 [ … ]        list
POST   /api/articles        → 201 { … }        create
GET    /api/articles/42     → 200 { … }        read one
PATCH  /api/articles/42     → 200 { … }        update
DELETE /api/articles/42     → 204 _            delete
GET    /api/articles/99     → 404 { error }    nope
POST   /api/articles (bad)  → 400 { error }    validation failed
\`\`\`

Version your API (\`/api/v1/\`), pluralize resources, and filter with query strings (\`?page=2&limit=20\`), not new endpoints.

**Passwords are never stored — only their hashes.**

\`\`\`
const hash = await bcrypt.hash(password, 12);   // salt is baked in
const ok = await bcrypt.compare(password, hash);
\`\`\`

bcrypt is *deliberately slow* + salted, so stolen hashes can't be brute-forced or rainbow-tabled. Never MD5/SHA a password; never log passwords.

**JWT (JSON Web Token)** = stateless auth. Server signs \`{ userId, exp }\`; client sends it as \`Authorization: Bearer <token>\`; server verifies the signature — **no session storage needed**.

\`\`\`
const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "15m" });
const payload = jwt.verify(token, SECRET);   // throws if forged/expired
\`\`\`

Rules: short-lived access tokens, refresh tokens to renew, secrets in environment variables (never in git), and HTTPS everywhere — a token sniffed in transit is game over.`,
      quiz: [
        {
          q: "POST /api/articles succeeds. Status?",
          options: ["200", "201", "204", "302"],
          answer: 1,
          explanation: "201 Created — the response also echoes the new resource.",
        },
        {
          q: "Why bcrypt over SHA-256 for passwords?",
          options: [
            "It's newer",
            "It's slow by design and salts automatically",
            "It's shorter",
            "SHA-256 is illegal",
          ],
          answer: 1,
          explanation:
            "Fast hashes make brute-force cheap; bcrypt's cost factor slows attackers to a crawl.",
        },
        {
          q: "JWTs are 'stateless' because…",
          options: [
            "They expire instantly",
            "The server needs no session store — the signature proves validity",
            "They store the database",
            "They never leave the server",
          ],
          answer: 1,
          explanation:
            "Verification is pure math on the token itself — scale horizontally without shared sessions.",
        },
        {
          q: "Where does the JWT secret belong?",
          options: ["In the repo", "In client-side code", "In an environment variable", "In the JWT itself"],
          answer: 2,
          explanation: "Secrets in env vars, injected at deploy — never committed.",
        },
        {
          q: "GET /api/users?limit=20&page=3 is…",
          options: [
            "Bad practice — make /api/users/page/3",
            "Standard REST pagination via query parameters",
            "A GraphQL query",
            "An invalid URL",
          ],
          answer: 1,
          explanation:
            "Filters, sorts, and pagination belong in query strings — one resource, many views.",
        },
      ],
    },
    {
      id: "databases",
      title: "Databases: SQL, Documents & ORMs",
      minutes: 12,
      reading: true,
      body: `**Relational (PostgreSQL)** — data as typed tables; relations are first-class; joins are the superpower.

\`\`\`
SELECT users.name, COUNT(orders.id) AS order_count
FROM users
LEFT JOIN orders ON orders.user_id = users.id
WHERE users.country = 'DE'
GROUP BY users.name
ORDER BY order_count DESC
LIMIT 10;
\`\`\`

Schema, constraints (\`FOREIGN KEY\`, \`NOT NULL\`, \`UNIQUE\`) mean the *database* rejects bad data — not just your app code.

**Document (MongoDB)** — JSON-ish documents, schema-flexible, nested data reads in one fetch:

\`\`\`
db.users.insertOne({ name: "Ada", tags: ["admin", "beta"], profile: { bio: "…" } });
db.users.find({ tags: "admin" });
\`\`\`

**Choosing:** multi-entity data with relations and reporting (money, orders, users) → SQL. Rapidly evolving/nested documents (content, catalogs, event logs) → Mongo. Postgres's JSONB makes it surprisingly good at both — when unsure, start Postgres.

**Indexes** are the difference between scanning a million rows and touching three:

\`\`\`
CREATE INDEX idx_orders_user ON orders(user_id);   -- lookup by user: instant
\`\`\`

Index what you filter/join/sort on; every index slightly slows writes. No index on \`orders.user_id\` = full table scan per user page.

**ORMs** (Prisma for SQL, Mongoose for Mongo) map code objects to rows/documents:

\`\`\`
// Prisma: type-safe, no SQL strings
const users = await prisma.user.findMany({
  where: { country: "DE" },
  include: { orders: true },
});
\`\`\`

They prevent injection, give autocompletion, and migrate schemas. Learn SQL anyway — every ORM leaks, and you'll debug a query eventually.`,
      quiz: [
        {
          q: "A JOIN is for…",
          options: [
            "Duplicating tables",
            "Combining rows from related tables via keys",
            "Deleting data",
            "Adding columns",
          ],
          answer: 1,
          explanation:
            "Joins stitch relations back together — orders to users, posts to authors.",
        },
        {
          q: "When does a document store (Mongo) shine?",
          options: [
            "Heavy multi-table transactions",
            "Nested, evolving documents read as one unit",
            "Strict financial schemas",
            "Excel exports",
          ],
          answer: 1,
          explanation:
            "Documents read whole aggregates without joins; flexible schemas evolve fast.",
        },
        {
          q: "An index on orders(user_id) makes 'orders of user X' queries…",
          options: [
            "Slower writes only, no benefit",
            "Near-instant lookups instead of full scans",
            "Return fewer rows",
            "Automatic joins",
          ],
          answer: 1,
          explanation:
            "The index is a sorted lookup structure — O(log n) instead of O(n) scans.",
        },
        {
          q: "What do ORMs like Prisma give you?",
          options: [
            "Type-safe queries and migrations without raw SQL strings",
            "Faster databases",
            "Automatic scaling",
            "Free hosting",
          ],
          answer: 0,
          explanation:
            "ORMs add type safety, injection safety, and migration tooling on top of the DB.",
        },
        {
          q: "The schema-first guarantee of SQL means…",
          options: [
            "The database itself rejects invalid data shapes",
            "Nothing — apps must validate",
            "Tables can't change",
            "Only Postgres does this",
          ],
          answer: 0,
          explanation:
            "Constraints enforce integrity at the last line of defense — the storage layer.",
        },
      ],
    },
    {
      id: "api-security",
      title: "API Security: CORS, Validation & Rate Limits",
      minutes: 11,
      reading: true,
      body: `Four shields every public API wears:

**1. CORS** — browsers block cross-origin responses by default. The server *opts in* via headers:

\`\`\`
app.use(cors({ origin: "https://yourapp.com" }));  // not "*"
\`\`\`

CORS is enforced by the *browser*; curl doesn't care. It protects users, not servers.

**2. Input validation** — never trust \`req.body\`. Validate shape, types, and ranges before touching the database:

\`\`\`
const schema = z.object({ email: z.string().email(), age: z.number().int().min(13) });
const data = schema.parse(req.body);   // throws 400-worthy error on garbage
\`\`\`

This kills injection and data-corruption bugs at the door.

**3. Rate limiting** — cap requests per IP/user to blunt brute force and abuse:

\`\`\`
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
\`\`\`

**4. Output discipline** — errors seen by clients must not leak stack traces, SQL, or file paths. Log details server-side; send the client a status code and a safe message.

**The threat model mindset:** every input is hostile, every client lies, every secret will leak if it can. Defense in depth — validation *and* limits *and* auth *and* HTTPS — because any single layer eventually fails.`,
      quiz: [
        {
          q: "CORS is enforced by…",
          options: ["The server's firewall", "The browser", "Node.js itself", "The database"],
          answer: 1,
          explanation:
            "Browsers block non-allowed cross-origin reads; curl/postman ignore CORS entirely.",
        },
        {
          q: "Never trust req.body means…",
          options: [
            "Validate and parse inputs against a schema before use",
            "Delete the body",
            "Only accept GET requests",
            "Encrypt the body",
          ],
          answer: 0,
          explanation:
            "Schema validation turns hostile garbage into a clean 400 before it reaches your logic.",
        },
        {
          q: "Rate limiting protects against…",
          options: [
            "Legitimate users",
            "Brute force and abuse spikes",
            "Slow databases",
            "CSS bugs",
          ],
          answer: 1,
          explanation:
            "Caps per IP/user blunt credential stuffing and scrapers.",
        },
        {
          q: "A safe error response contains…",
          options: [
            "The full stack trace",
            "A status code and a safe, human-readable message",
            "The SQL query",
            "Server file paths",
          ],
          answer: 1,
          explanation:
            "Details go to server logs; clients get the minimum needed to recover.",
        },
        {
          q: "Defense in depth means…",
          options: [
            "One perfect firewall",
            "Multiple independent layers — validation, auth, limits, HTTPS",
            "Hiding the API URL",
            "Encrypted cookies only",
          ],
          answer: 1,
          explanation:
            "Any single layer eventually fails; layered controls don't fail together.",
        },
      ],
    },
  ],
};
