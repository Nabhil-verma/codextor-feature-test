/**
 * Plain-English error translation: parse the raw runtime error from the
 * sandbox into a beginner-friendly one-liner plus an actionable fix.
 */

type TranslatedError = {
  /** Short title of the matched pattern, e.g. "You're using an undefined variable" */
  title: string;
  /** Beginner-friendly explanation of what actually happened */
  plain: string;
  /** Concrete, actionable fix suggestion */
  fix: string;
};

type Rule = {
  pattern: RegExp;
  title: string;
  plain: string;
  fix: string;
};

const RULES: Rule[] = [
  {
    // TypeError: Cannot read properties of undefined (reading 'name')
    pattern: /Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/,
    title: "You're reading a property off something that doesn't exist",
    plain:
      "The code asked for a property (like .name) on a value that is $1 — a placeholder meaning 'no value here yet'.",
    fix: "console.log the variable right before the line that crashed to see what's actually in it. Common causes: a typo in the property name, an array index that doesn't exist, or a function that returned nothing (forgot the return?).",
  },
  {
    pattern: /\b(\w+) is not defined\b/,
    title: "That name doesn't exist yet",
    plain: "The code used the name \"$1\" before it was ever created.",
    fix: "Check the spelling (JS is case-sensitive: userName ≠ username). If it's meant to be a variable, declare it first with const/let. If it's a function, make sure it's defined above where you call it.",
  },
  {
    pattern: /\b(\w+) is not a function\b/,
    title: "That value isn't callable",
    plain:
      "The code tried to run \"$1(...)\", but \"$1\" holds something that isn't a function (maybe a number, string, or undefined).",
    fix: "console.log(typeof $1) to see what it really is. Classic mix-ups: calling an array method that doesn't exist on it, forgetting () on a function you meant to CALL, or typos like lenght vs length.",
  },
  {
    pattern: /Assignment to constant variable/,
    title: "You tried to change a const",
    plain:
      "A variable declared with const can't be reassigned — that's the whole point of const.",
    fix: "If the value genuinely changes, declare it with let instead. If you're mutating an object or array (push, obj.x = …), that's allowed — reassignment (x = …) is what's forbidden.",
  },
  {
    pattern: /Unexpected end of (?:JSON )?input|JSON\.parse: unexpected/i,
    title: "The JSON was cut short",
    plain: "JSON.parse got a string that ends too early — it isn't complete, valid JSON.",
    fix: "console.log the exact string you're parsing. Check for a missing } or ], and remember keys must use double quotes: {\"name\": \"Ada\"}.",
  },
  {
    pattern: /Unexpected token '<'/,
    title: "You got HTML where you expected data",
    plain:
      "A response that should have been JSON was actually an HTML page (it starts with '<'). That usually means the URL doesn't exist.",
    fix: "Print the URL you're fetching and check for typos — the mock server routes are /api/users, /api/users/:id, and /api/flaky. Also check res.ok / res.status before calling res.json().",
  },
  {
    pattern: /missing \) after argument list|missing \)/i,
    title: "A closing ) is missing",
    plain: "A function call opened with ( but never got its matching ).",
    fix: "Count your parentheses on the failing line — every ( needs a ). Formatting each call on its own line makes mismatches obvious.",
  },
  {
    pattern: /missing \} after|Unexpected token '\}'/,
    title: "A brace { } doesn't match up",
    plain: "A block of code was opened with { but the closing } is missing or in the wrong place.",
    fix: "Indent every block one level — the spot where the indentation stops making sense is usually where a } is missing. Most editors bounce the cursor to the matching brace when you click one.",
  },
  {
    pattern: /Unexpected (?:token|identifier|string)/,
    title: "The syntax doesn't parse",
    plain: "The JavaScript engine hit something it couldn't understand at that spot — usually a typo.",
    fix: "Look at the named token and the line above it: a missing comma, a stray quote, or = where == was meant. Reading the line OUT LOUD often reveals it.",
  },
  {
    pattern: /took too long|infinite loop/i,
    title: "Possible infinite loop",
    plain:
      "The sandbox stopped your script because it ran past the time limit — a loop never reached its stop condition.",
    fix: "Check the loop variable actually changes: is the counter incremented? Does the while condition EVER become false? A classic is while (i < 10) with i never updated inside.",
  },
  {
    pattern: /Output limit reached/,
    title: "Too much output",
    plain: "Your program printed more than 500 lines, so the sandbox cut it off.",
    fix: "You probably have a runaway loop that logs every iteration. Log once after the loop instead of inside it, or log a summary (the count, the total).",
  },
  {
    pattern: /Cannot destructure/,
    title: "Destructuring an empty value",
    plain: "The code tried to unpack properties from a value that is undefined or null.",
    fix: "console.log the value first. If it can legitimately be empty, guard it: const { a, b } = maybeEmpty ?? {}.",
  },
  {
    pattern: /Maximum call stack/,
    title: "Runaway recursion",
    plain: "A function kept calling itself until memory ran out — it never hit its base case.",
    fix: "Every recursive function needs a base case that returns WITHOUT calling itself, and each call must move toward it. Print the arguments at the top of the function to watch the progress.",
  },
  {
    pattern: /is not iterable/,
    title: "That value can't be looped over",
    plain: "for…of / destructuring needs an iterable (array, string, Map…), and the value isn't one.",
    fix: "console.log it — you probably have a plain object where an array was expected, or forgot to call a method that returns an array.",
  },
  {
    pattern: /network|fetch|Failed to fetch/i,
    title: "The request couldn't go out",
    plain: "The fetch itself failed before getting a response — a network-level problem.",
    fix: "Check the URL for typos and that you're not hitting an external API from the sandbox (only the mock /api/* routes work here). Wrap fetches in try/catch to handle failures.",
  },
];

export function translateError(raw: string): TranslatedError {
  for (const rule of RULES) {
    const m = raw.match(rule.pattern);
    if (m) {
      // Interpolate captured groups into the texts ($1, $2, …).
      const fill = (s: string) =>
        s.replace(/\$(\d)/g, (_, d) => m[Number(d)] ?? "");
      return {
        title: fill(rule.title),
        plain: fill(rule.plain),
        fix: fill(rule.fix),
      };
    }
  }
  return {
    title: "Something broke while running",
    plain: "The sandbox reported an error it doesn't have a friendly explanation for.",
    fix: "Read the raw error below — the type name (TypeError, SyntaxError…) and the first quoted name are the best clues. Try commenting out half the code to narrow it down.",
  };
}
