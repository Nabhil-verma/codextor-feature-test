/* ═══════════════════════════════════════════════════════════════
   Curriculum check expressions, evaluated without `eval`.

   Checks are tiny expressions over the captured output. The complete
   shipped vocabulary is `output.includes(...)`, `output.indexOf(...)`,
   `output.lastIndexOf(...)`, `output.split(...)[i].trim()`, string
   comparisons and `&&`/`||`. They used to be compiled with
   `new Function`, which evaluates in the page's own global scope: any
   expression reaching it could read `localStorage` (a learner's BYOK
   API keys live there), touch the DOM, or exfiltrate both.

   Because the vocabulary is fixed and small, this module parses that
   grammar and walks the tree directly. No string is ever executed, and
   an expression this parser does not recognise fails closed —
   `checkExpressionSupported` exists so a test can prove every shipped
   expression is recognised, instead of a new one silently grading false.
   ═══════════════════════════════════════════════════════════════ */

type CheckValue = string | number | boolean | null | string[];

type Node =
  | { kind: "literal"; value: CheckValue }
  | { kind: "includes"; arg: string }
  | { kind: "indexOf"; arg: string; fromEnd: boolean }
  | { kind: "split"; arg: string }
  | { kind: "index"; target: Node; index: number }
  | { kind: "trim"; target: Node }
  | { kind: "length"; target: Node }
  | { kind: "not"; value: Node }
  | { kind: "and"; left: Node; right: Node }
  | { kind: "or"; left: Node; right: Node }
  | { kind: "compare"; op: ">" | "<" | ">=" | "<="; left: Node; right: Node }
  | { kind: "equal"; negated: boolean; left: Node; right: Node };

/* Longest operators first: `===` must win over `==`, `>=` over `>`. */
const OPERATORS = ["===", "!==", "==", "!=", ">=", "<=", "&&", "||", "!", ">", "<", ".", "(", ")", "[", "]"];

type Token =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "name"; value: string }
  | { type: "op"; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      let value = "";
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") {
          i += 1;
          const esc = source[i];
          if (esc === undefined) throw new Error("unterminated escape");
          value += esc === "n" ? "\n" : esc === "t" ? "\t" : esc === "r" ? "\r" : esc;
          i += 1;
        } else {
          value += source[i];
          i += 1;
        }
      }
      if (i >= source.length) throw new Error("unterminated string");
      i += 1; // closing quote
      tokens.push({ type: "string", value });
      continue;
    }

    const num = /^\d+(?:\.\d+)?/.exec(source.slice(i));
    if (num) {
      tokens.push({ type: "number", value: Number(num[0]) });
      i += num[0].length;
      continue;
    }

    const name = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(i));
    if (name) {
      tokens.push({ type: "name", value: name[0] });
      i += name[0].length;
      continue;
    }

    const op = OPERATORS.find((candidate) => source.startsWith(candidate, i));
    if (op) {
      tokens.push({ type: "op", value: op });
      i += op.length;
      continue;
    }

    throw new Error(`unexpected character: ${ch}`);
  }
  return tokens;
}

/** Recursive-descent parser: `||` < `&&` < equality < comparison < `!` < postfix. */
function parse(source: string): Node {
  const tokens = tokenize(source);
  let pos = 0;

  const takeOp = (value: string): boolean => {
    const t = tokens[pos];
    if (t && t.type === "op" && t.value === value) {
      pos += 1;
      return true;
    }
    return false;
  };
  const expectOp = (value: string): void => {
    if (!takeOp(value)) throw new Error(`expected "${value}"`);
  };
  const expectString = (): string => {
    const t = tokens[pos];
    if (!t || t.type !== "string") throw new Error("expected a string literal");
    pos += 1;
    return t.value;
  };

  const parseOr = (): Node => {
    let left = parseAnd();
    while (takeOp("||")) left = { kind: "or", left, right: parseAnd() };
    return left;
  };

  const parseAnd = (): Node => {
    let left = parseEquality();
    while (takeOp("&&")) left = { kind: "and", left, right: parseEquality() };
    return left;
  };

  const parseEquality = (): Node => {
    const left = parseComparison();
    if (takeOp("===") || takeOp("==")) return { kind: "equal", negated: false, left, right: parseComparison() };
    if (takeOp("!==") || takeOp("!=")) return { kind: "equal", negated: true, left, right: parseComparison() };
    return left;
  };

  const parseComparison = (): Node => {
    const left = parseUnary();
    for (const op of [">", "<", ">=", "<="] as const) {
      if (takeOp(op)) return { kind: "compare", op, left, right: parseUnary() };
    }
    return left;
  };

  const parseUnary = (): Node => {
    if (takeOp("!")) return { kind: "not", value: parseUnary() };
    return parsePostfix();
  };

  const parsePostfix = (): Node => {
    let node = parsePrimary();
    for (;;) {
      if (takeOp("[")) {
        const t = tokens[pos];
        if (!t || t.type !== "number" || !Number.isInteger(t.value)) throw new Error("expected an integer index");
        pos += 1;
        expectOp("]");
        node = { kind: "index", target: node, index: t.value };
        continue;
      }
      if (takeOp(".")) {
        const t = tokens[pos];
        if (!t || t.type !== "name" || (t.value !== "trim" && t.value !== "length")) {
          throw new Error("unsupported accessor");
        }
        pos += 1;
        if (t.value === "length") {
          node = { kind: "length", target: node };
          continue;
        }
        expectOp("(");
        expectOp(")");
        node = { kind: "trim", target: node };
        continue;
      }
      break;
    }
    return node;
  };

  const parsePrimary = (): Node => {
    if (takeOp("(")) {
      const node = parseOr();
      expectOp(")");
      return node;
    }

    const t = tokens[pos];
    if (!t) throw new Error("unexpected end of expression");

    if (t.type === "string" || t.type === "number") {
      pos += 1;
      return { kind: "literal", value: t.value };
    }

    if (t.type === "name") {
      if (t.value === "output") {
        pos += 1;
        expectOp(".");
        const method = tokens[pos];
        if (!method || method.type !== "name") throw new Error("expected an output method");
        pos += 1;
        if (method.value === "includes" || method.value === "split" || method.value === "indexOf" || method.value === "lastIndexOf") {
          expectOp("(");
          const arg = expectString();
          expectOp(")");
          if (method.value === "includes") return { kind: "includes", arg };
          if (method.value === "split") return { kind: "split", arg };
          return { kind: "indexOf", arg, fromEnd: method.value === "lastIndexOf" };
        }
        throw new Error(`unsupported output method: ${method.value}`);
      }
      if (t.value === "true" || t.value === "false") {
        pos += 1;
        return { kind: "literal", value: t.value === "true" };
      }
      if (t.value === "null") {
        pos += 1;
        return { kind: "literal", value: null };
      }
      throw new Error(`unknown identifier: ${t.value}`);
    }

    throw new Error("unexpected token");
  };

  const node = parseOr();
  if (pos !== tokens.length) throw new Error("trailing input");
  return node;
}

function evaluate(node: Node, output: string): CheckValue {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "includes":
      return output.includes(node.arg);
    case "indexOf":
      return node.fromEnd ? output.lastIndexOf(node.arg) : output.indexOf(node.arg);
    case "split":
      return output.split(node.arg);
    case "index": {
      const target = evaluate(node.target, output);
      if (typeof target !== "string" && !Array.isArray(target)) throw new Error("cannot index this value");
      return target[node.index] ?? null;
    }
    case "trim": {
      const target = evaluate(node.target, output);
      if (typeof target !== "string") throw new Error("trim() needs a string");
      return target.trim();
    }
    case "length": {
      const target = evaluate(node.target, output);
      if (typeof target !== "string" && !Array.isArray(target)) throw new Error("length needs a string or an array");
      return target.length;
    }
    case "not":
      return !evaluate(node.value, output);
    case "and":
      return Boolean(evaluate(node.left, output)) && Boolean(evaluate(node.right, output));
    case "or":
      return Boolean(evaluate(node.left, output)) || Boolean(evaluate(node.right, output));
    case "compare": {
      const left = evaluate(node.left, output);
      const right = evaluate(node.right, output);
      if ((typeof left !== "number" && typeof left !== "string") || (typeof right !== "number" && typeof right !== "string")) {
        throw new Error("comparison needs numbers or strings");
      }
      switch (node.op) {
        case ">":
          return left > right;
        case "<":
          return left < right;
        case ">=":
          return left >= right;
        case "<=":
          return left <= right;
      }
    }
    case "equal": {
      const left = evaluate(node.left, output);
      const right = evaluate(node.right, output);
      const same =
        Array.isArray(left) && Array.isArray(right)
          ? left.length === right.length && left.every((v, i) => v === right[i])
          : left === right;
      return node.negated ? !same : same;
    }
  }
}

const cache = new Map<string, Node>();

function parseCached(source: string): Node {
  const hit = cache.get(source);
  if (hit) return hit;
  const node = parse(source);
  // Curriculum-sized cache; a runaway caller can't grow it without bound.
  if (cache.size < 500) cache.set(source, node);
  return node;
}

/** Is this expression inside the grammar the evaluator understands? */
export function checkExpressionSupported(source: string): boolean {
  try {
    parseCached(source);
    return true;
  } catch {
    return false;
  }
}

/**
 * Grade `output` with a curriculum check expression. Anything the evaluator
 * does not recognise — a syntax error, an unknown method, a value that can't
 * be compared — grades as `false`, exactly like the `new Function` version
 * did, but without executing a string.
 */
export function evaluateCheckExpression(source: string, output: string): boolean {
  try {
    return Boolean(evaluate(parseCached(source), output));
  } catch {
    return false;
  }
}
