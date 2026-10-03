import type { Track } from "./types";

export const pythonTrack: Track = {
  id: "python",
  title: "Python & Data Fundamentals",
  blurb:
    "Python syntax, OOP and the pandas/numpy workflow — three lessons now execute in the browser (Pyodide).",
  numeral: "Ⅴ",
  optional: true,
  optionalWhy:
    "Three of four lessons now execute (Pyodide, stdlib only) and the fourth is an honest reading. Play it when your target stack is Python; skip it if it isn't.",
  lessons: [
    {
      id: "python-syntax",
      title: "Python Syntax & Core Collections",
      minutes: 10,
      lang: "python",
      body: `Python trades braces for **indentation** — the whitespace *is* the syntax:

\`\`\`
def greet(name):
    if not name:
        return "Hello, stranger"
    return f"Hello, {name}!"
\`\`\`

**The four core collections:**

\`\`\`
nums = [1, 2, 3]              # list   — ordered, mutable
point = (3, 4)                # tuple  — ordered, immutable
tags = {"py", "data"}         # set    — unique, unordered
user = {"name": "Ada", "age": 36}   # dict — key→value
\`\`\`

**Slicing** works on any sequence: \`nums[1:3]\`, \`nums[::-1]\` (reversed), \`s[:2] + s[2:]\`.

**List comprehensions** are Python's signature move — map + filter in one readable line:

\`\`\`
squares = [n * n for n in nums]
evens   = [n for n in nums if n % 2 == 0]
pairs   = [(x, y) for x in "ab" for y in (1, 2)]
\`\`\`

**Generators** yield values lazily — constant memory over huge streams:

\`\`\`
def countdown(n):
    while n > 0:
        yield n
        n -= 1

total = sum(countdown(1_000_000))   # never materializes the list
\`\`\`

**f-strings** format anything: \`f"{user['name']} is {user['age']:>3} years old"\`.

**The trap this exercise plants:** a mutable default argument. \`def f(items=[])\`
evaluates that \`[]\` **once, when the function is defined**, so every call that
omits the argument shares the same list. It is the single most common Python
bug that passes review, and it is silent.

Rule of thumb: list for order, tuple for fixed shapes, set for membership, dict for lookups.`,
      starter: `def add_tag(tag, tags=[]):
    # TODO: the default list is created ONCE — every call shares it.
    tags.append(tag)
    return tags

print("first:", add_tag("py"))
print("second:", add_tag("data"))
print("defaults independent:", add_tag("x") == ["x"])`,
      check: {
        expr: "output.includes(\"second: ['data']\") && output.includes('defaults independent: True')",
        hint: "Never use a mutable default. Take `tags=None` and create the list inside the function — then each call that omits the argument gets its own.",
        hints: [
          {
            tier: 1,
            text: "Run it and read the three lines. Two of them disagree with what a *fresh* call should produce — which call is carrying state it should not have?",
          },
          {
            tier: 2,
            text: "The `[]` in the signature is evaluated once, when Python defines the function — not on each call. So `tags` is one shared object, and `first`/`second` are appending to the same list.",
          },
          {
            tier: 3,
            text: "Signature becomes `def add_tag(tag, tags=None):` and the first line of the body is `if tags is None: tags = []`. A caller passing their own list still works.",
          },
        ],
      },
      predict: [
        {
          prompt: "What does this Python print?",
          lang: "python",
          code: `nums = [1, 2, 3, 4]\nresult = [n * 2 for n in nums if n % 2 == 0]\nprint(result)`,
          options: ["[2, 4, 6, 8]", "[4, 8]", "[2, 4]", "[4, 8, 12, 16]"],
          answer: 1,
          explanation:
            "The filter keeps even numbers (2, 4) FIRST, then maps ×2 → [4, 8]. In comprehensions, `if` filters before the expression runs.",
        },
        {
          prompt: "And this one?",
          lang: "python",
          code: `def add_item(item, items=[]):\n    items.append(item)\n    return items\n\nprint(add_item(1))\nprint(add_item(2))`,
          options: [
            "[1] then [2] — a fresh list each call",
            "[1] then [1, 2] — the default list is created ONCE at function definition",
            "[1] then None",
            "It raises a TypeError",
          ],
          answer: 1,
          explanation:
            "Python's infamous mutable default: the [] is evaluated once when `def` runs, so both calls share the same list. Use `items=None` and create inside.",
        },
      ],
      quiz: [
        {
          q: "A generated function reads `def load(path, cache={}):`. What should you flag?",
          options: [
            "Nothing — defaults make the cache optional",
            "The mutable default is shared across every call, so entries leak between callers",
            "`{}` is slower than `dict()`",
            "The parameter should be keyword-only",
          ],
          answer: 1,
          explanation:
            "Same bug as the exercise: the default is created once at definition time, so the cache is global state wearing a parameter's clothes. Use `cache=None`.",
        },
        {
          q: "AI-written code does `if user['role'] is 'admin':`. Why is that wrong?",
          options: [
            "It is slower than ==",
            "`is` compares identity, not value — it works by accident for interned strings and fails for computed ones",
            "It always raises a SyntaxError",
            "It is fine in Python 3",
          ],
          answer: 1,
          explanation:
            "`is` asks 'the same object?', `==` asks 'the same value?'. Interned literals hide the difference until a role arrives from a database or an f-string.",
        },
        {
          q: "[n*n for n in range(4)] evaluates to…",
          options: ["[0,1,2,3]", "[0,1,4,9]", "[1,4,9,16]", "An error"],
          answer: 1,
          explanation: "range(4) is 0..3; each is squared.",
        },
        {
          q: "An agent writes `def load(path, cache={}):`. What do you ask it to change?",
          options: [
            "Nothing — the cache is optional by design",
            "The mutable default: it is created once at definition time, so every caller shares one cache",
            "The parameter name",
            "Add a type hint",
          ],
          answer: 1,
          explanation:
            "The default is evaluated once, when the function is defined — so the 'optional' cache is really process-global state. The fix is `cache=None` and create inside.",
        },
        {
          q: "Generated code does `if items == []` to test for an empty list. Why flag it?",
          options: [
            "It is slower than `is`",
            "It works, but `if not items` is the idiomatic form — and `== []` breaks for any other empty sequence (a tuple, a generator's result)",
            "It raises a TypeError",
            "It mutates the list",
          ],
          answer: 1,
          explanation:
            "Truthiness asks 'is it empty?'; equality asks 'is it exactly this list?'. The second question is narrower than the one the code means to ask.",
        },
      ],
    },
    {
      id: "python-oop",
      title: "OOP: Classes, Inheritance & Exceptions",
      minutes: 10,
      lang: "python",
      sort: {
        prompt: "Arrange the exception-handling block so it runs correctly.",
        items: [
          "try:",
          "    total = int(user_input)",
          "except ValueError as err:",
          "    print('not a number:', err)",
          "finally:",
          "    print('attempt finished')",
        ],
        explanation:
          "try holds the risky line, except catches the specific failure it can handle, and finally always runs — even when the call returned or raised.",
      },
      body: `Classes bundle **data + behavior**:

\`\`\`
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner          # public attribute
        self._balance = balance     # _convention: internal

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount
        return self._balance

    @property
    def balance(self):              # computed attribute
        return self._balance
\`\`\`

**Inheritance** — subclass, extend, override; \`super()\` calls up:

\`\`\`
class SavingsAccount(BankAccount):
    def __init__(self, owner, balance=0, rate=0.02):
        super().__init__(owner, balance)
        self.rate = rate

    def add_interest(self):
        self.deposit(self._balance * self.rate)
\`\`\`

**Duck typing** is Python's philosophy: behavior over type — anything with \`.deposit()\` works where an account is expected. \`dataclasses\` remove the boilerplate for plain data holders.

**Exception handling** — catch *specific*, handle *meaningfully*:

\`\`\`
try:
    risky()
except ValueError as err:
    print(f"bad input: {err}")
except (KeyError, IndexError):
    print("missing data")
else:
    print("only on success")
finally:
    close_resources()   # always runs
\`\`\`

Never bare-\`except:\` (it swallows your own bugs). For cleanup, prefer context managers:

\`\`\`
with open("data.csv") as f:    # closes even on exception
    rows = f.readlines()
\`\`\`

**Why the bare \`except\` matters in an AI-written diff:** a handler that catches
everything converts a crash into a plausible wrong value. The crash was
information; the silent \`None\` is a bug that ships.`,
      starter: `class MissingFieldError(Exception):
    pass

def parse_age(record):
    if "age" not in record:
        raise MissingFieldError("age")
    return int(record["age"])

def read_age(record):
    # TODO: a bare except catches everything — including bugs you want to see.
    try:
        return ("ok", parse_age(record))
    except:
        return ("failed", None)

print("valid:", read_age({"age": "36"}))
print("bad value:", read_age({"age": "thirty"}))
print("missing field:", read_age({}))`,
      check: {
        expr: "output.includes(\"('ok', 36)\") && output.includes(\"('invalid', None)\") && output.includes(\"('missing', None)\")",
        hint: "Handle each failure it can actually handle: `except ValueError` for a value it cannot parse, `except MissingFieldError` for an absent field. Let anything else keep propagating.",
        hints: [
          {
            tier: 1,
            text: "Run it. All three rows report the same status — but they are three different situations. Which distinction is the code losing?",
          },
          {
            tier: 2,
            text: "`except:` catches every exception, including `TypeError`s from your own bugs. Catch the two named failures separately so each can be reported honestly.",
          },
          {
            tier: 3,
            text: "Two handlers: `except ValueError: return ('invalid', None)` and `except MissingFieldError: return ('missing', None)`. No bare except.",
          },
        ],
      },
      quiz: [
        {
          q: "__init__ runs when…",
          options: ["The class is defined", "A new instance is created", "The program exits", "Any method is called"],
          answer: 1,
          explanation: "It's the constructor — initialize instance attributes there.",
        },
        {
          q: "super().__init__() does what?",
          options: [
            "Deletes the parent",
            "Runs the parent class's initializer",
            "Creates a static method",
            "Nothing",
          ],
          answer: 1,
          explanation: "It delegates construction up the chain before adding subclass state.",
        },
        {
          q: "@property lets you…",
          options: [
            "Access a computed value like an attribute",
            "Make methods private",
            "Define constants",
            "Skip __init__",
          ],
          answer: 0,
          explanation: "balance instead of balance() — getter syntax with method logic.",
        },
        {
          q: "An agent's handler reads `except Exception: pass`. What do you ask for?",
          options: [
            "Nothing — it is defensive",
            "Catch the specific exception, and at minimum log it — `pass` hides real failures",
            "Add a bare `except:` for symmetry",
            "Wrap it in another try",
          ],
          answer: 1,
          explanation:
            "Silently swallowing every exception turns crashes into wrong values. Name the failure you can handle; let the rest surface.",
        },
        {
          q: "The 'with open(...)' pattern guarantees…",
          options: [
            "Faster reads",
            "The file closes even if an exception occurs",
            "Compression",
            "Encoding fixes",
          ],
          answer: 1,
          explanation: "Context managers pair setup/teardown deterministically.",
        },
      ],
    },
    {
      id: "pandas-numpy",
      title: "Data Wrangling: NumPy & pandas",
      minutes: 12,
      reading: true,
      body: `**NumPy** — C-speed math on arrays. The superpower is **vectorization**: express operations whole-array, never loop.

import numpy as np
prices = np.array([10.0, 20.0, 30.0])
with_tax = prices * 1.19          # elementwise — no loop
big = np.arange(1_000_000)
# big.sum() runs in ~0.5ms vs ~25ms for a pure-Python loop
\`\`\`

**pandas** — labeled tables (DataFrames) on top of NumPy:

import pandas as pd
df = pd.read_csv("sales.csv")

df.head()                       # peek
df.info()                       # dtypes + missing counts
df.describe()                   # stats summary
\`\`\`

**The cleaning ritual:**

df = df.dropna(subset=["price"])            # drop missing criticals
df["price"] = df["price"].astype(float)
df["revenue"] = df["qty"] * df["price"]      # vectorized new column
df = df[df["qty"] > 0]                       # boolean filtering
df["region"] = df["region"].str.strip().str.title()
\`\`\`

**Group-by → aggregate** is the heart of analysis:

summary = (df.groupby("region")
             .agg(total=("revenue", "sum"), orders=("revenue", "count"))
             .sort_values("total", ascending=False))
\`\`\`

**Merging** = SQL joins: \`pd.merge(orders, customers, on="customer_id", how="left")\`.

Workflow rule: profile first (\`info\`/\`describe\`), clean second, analyze third — and keep a random \`df.sample(5)\` eyeball-check in the loop. Garbage in, confident nonsense out.

**Honest limit:** this lesson is a reading. numpy and pandas are not shipped
with the in-browser Python runtime (their wheels would add tens of megabytes to
a 13 MB download), so nothing here is executed. The three other Python lessons
run for real.`,
      quiz: [
        {
          q: "Vectorization means…",
          options: [
            "Using for loops carefully",
            "Applying operations to whole arrays at C speed",
            "Using lists",
            "Parallelizing across servers",
          ],
          answer: 1,
          explanation: "NumPy pushes loops into compiled C — often 50–100× faster.",
        },
        {
          q: "df.groupby('region').agg(...) is analogous to…",
          options: ["SQL GROUP BY + aggregates", "A JS map", "Sorting", "A pivot table export"],
          answer: 0,
          explanation: "Split → apply → combine; same semantics as SQL grouping.",
        },
        {
          q: "df[df['qty'] > 0] returns…",
          options: [
            "A view that mutates df",
            "Rows where the condition holds (a filtered frame)",
            "A single boolean",
            "The column qty",
          ],
          answer: 1,
          explanation: "Boolean indexing — the mask selects matching rows.",
        },
        {
          q: "First step on a fresh dataset?",
          options: [
            "Fit a model",
            "Profile it: info(), describe(), head()",
            "Delete duplicates",
            "Plot everything",
          ],
          answer: 1,
          explanation: "Understand dtypes and missingness before transforming anything.",
        },
        {
          q: "how='left' in pd.merge keeps…",
          options: [
            "Only matching rows",
            "All rows from the left frame, matched where possible",
            "All rows from both",
            "Random rows",
          ],
          answer: 1,
          explanation: "Left join semantics — exactly like SQL's LEFT JOIN.",
        },
      ],
    },
    {
      id: "python-llm-api",
      title: "Calling LLM APIs from Python",
      minutes: 14,
      lang: "python",
      pythonPrelude: `import sys, types
mod = types.ModuleType("client")

class RateLimitError(Exception):
    """429 — retryable, but only a bounded number of times."""
    pass

class BadRequestError(Exception):
    """400 — the request itself is wrong. Retrying makes it worse."""
    pass

_state = {"calls": 0}

def call_model(prompt):
    _state["calls"] += 1
    if _state["calls"] <= 2:
        raise RateLimitError("429 rate limited")
    return {"text": [{"content": "Refunds are processed in 5 business days."}]}

def validate(payload):
    raise BadRequestError("400 malformed request")

mod.RateLimitError = RateLimitError
mod.BadRequestError = BadRequestError
mod.call_model = call_model
mod.validate = validate
sys.modules["client"] = mod
`,
      body: `The fixture module \`client\` stands in for a real provider SDK: its
\`call_model()\` raises \`RateLimitError\` on the first two calls of every run and
succeeds on the third, so retry behaviour is **deterministic** — no network, no
flakiness. This is the same trade the API track makes with its mock REST server.

**The four failure modes of a hand-written Python LLM client:**

1. **No retry at all.** The first 429 becomes a traceback. Rate limits are the
   *normal* operating condition of a hosted model.
2. **Retrying the wrong thing.** A 400 means the request is malformed — five
   attempts are five identical failures, plus load on a service that already
   told you no. Retry only what is retryable.
3. **No timeout.** A client with no timeout waits forever; one long request
   becomes a hung worker. (The JS track calls the same mistake the unawaited
   value.)
4. **Logging the credential.** \`print(api_key)\` or an error string that
   interpolates the header puts a live key in your logs — which is the security
   track's leak, arriving through a debugging shortcut.

**The retry shape worth memorising:** bounded attempts, retry only the
retryable error, and say what you handled. Silence is how a retry loop hides a
permanent failure.`,
      starter: `from client import call_model, RateLimitError, BadRequestError, validate

def ask(prompt):
    # TODO: this crashes on the first 429 — no retry, no bound.
    return call_model(prompt)["text"][0]["content"]

print("answer:", ask("summarise: refund policy"))
print("retries:", 0)

# A 400 must never be retried — fail fast instead.
try:
    validate({"prompt": ""})
except BadRequestError:
    print("400 -> raised, not retried")`,
      check: {
        expr: "output.includes('answer: Refunds are processed in 5 business days.') && output.includes('retries: 2') && output.includes('handled: RateLimitError') && output.includes('400 -> raised, not retried')",
        hint: "Retry only RateLimitError, cap the attempts, and print a line each time you handle one. Let every other exception keep propagating — including BadRequestError.",
        hints: [
          {
            tier: 1,
            text: "Run it and read the traceback. The fixture is telling you exactly what went wrong and when — the client just does not listen.",
          },
          {
            tier: 2,
            text: "You need a loop with a bounded attempt count, and the `except` clause must name only `RateLimitError`. Retrying `BadRequestError` would produce five identical failures.",
          },
          {
            tier: 3,
            text: "Wrap the call in `try/except RateLimitError`, count attempts, print `handled: RateLimitError` in the handler, and re-raise once the count reaches your maximum. Return `(text, attempts)` so the caller can print both.",
          },
        ],
      },
      predict: [
        {
          prompt: "Which line of this generated client leaks a credential?",
          lang: "python",
          code: `import requests\n\ndef chat(prompt, api_key):\n    try:\n        r = requests.post(\n            URL,\n            headers={"Authorization": f"Bearer {api_key}"},\n            json={"prompt": prompt},\n        )\n        return r.json()["choices"][0]["text"]\n    except Exception as err:\n        print(f"request failed with key {api_key}: {err}")\n        return ""`,
          options: [
            "The f-string in the header",
            "The `except Exception` handler, which both swallows every failure and prints the key",
            "`r.json()[\"choices\"][0][\"text\"]`",
            "Nothing — it is a normal client",
          ],
          answer: 1,
          explanation:
            "Two defects in one line: `except Exception` hides real errors, and interpolating `api_key` writes a live credential into whatever collects stdout — CI logs, a container, an error tracker.",
        },
      ],
      quiz: [
        {
          q: "A 429 arrives. The correct response is…",
          options: [
            "Fail the request — the user can retry",
            "Retry with backoff, bounded by an attempt cap",
            "Retry immediately in a tight loop",
            "Drop the request silently",
          ],
          answer: 1,
          explanation:
            "Rate limits are normal. Backoff plus a bound: immediate retries turn a blip into a self-inflicted denial of service.",
        },
        {
          q: "Which error should never be retried?",
          options: ["429 rate limit", "503 unavailable", "400 bad request", "Connection reset"],
          answer: 2,
          explanation:
            "A malformed request fails identically every time — retrying multiplies the mistake and the load.",
        },
        {
          q: "Why does a missing timeout matter more in production than locally?",
          options: [
            "It does not",
            "A hung request holds a worker until the platform kills it, so one slow dependency becomes an outage",
            "Timeouts only affect billing",
            "Python has no timeouts",
          ],
          answer: 1,
          explanation:
            "Every request that never returns occupies capacity. Timeouts are how a slow dependency stays a slow dependency instead of an outage.",
        },
        {
          q: "The retry loop prints nothing when it handles an error. What is the risk?",
          options: [
            "None — quieter logs are better",
            "A permanent failure looks identical to a slow success, so the incident is invisible",
            "Printing costs latency",
            "The error is retried twice",
          ],
          answer: 1,
          explanation:
            "Handled-and-recovered is worth one line. Without it you cannot tell a retry that worked from a retry that is still happening.",
        },
        {
          q: "The fixture makes `call_model` fail exactly twice per run. Why is that deliberate?",
          options: [
            "To make the exercise harder",
            "So retry behaviour is graded deterministically — the same code always produces the same result",
            "Because real APIs fail twice",
            "To test memory",
          ],
          answer: 1,
          explanation:
            "Grading has to be reproducible. A live provider would make the same exercise pass or fail on network luck.",
        },
      ],
    },
  ],
};