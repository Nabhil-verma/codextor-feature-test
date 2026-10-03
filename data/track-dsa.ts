import type { Track } from "./types";
import { debugChallenge } from "./debug-challenges";

export const dsaTrack: Track = {
  id: "dsa",
  title: "Data Structures & Algorithms",
  blurb: "Big-O thinking, classic structures, and the patterns interviewers actually ask.",
  numeral: "Ⅳ",
  lessons: [
    {
      id: "big-o",
      title: "Big-O: Measuring Growth, Not Seconds",
      minutes: 10,
      body: `Big-O answers one question: **how does work grow as input grows?** Not "how fast on my laptop" — that changes with hardware. Growth class doesn't.

| Class | Name | Feel |
|---|---|---|
| O(1) | constant | instant, any size |
| O(log n) | logarithmic | doubles input, +1 step |
| O(n) | linear | doubles input, doubles work |
| O(n log n) | linearithmic | good sorting |
| O(n²) | quadratic | fine at 1k, dead at 1M |

\`\`\`
// O(1): one operation regardless of n
arr[0];

// O(n): touch everything once
arr.forEach((x) => console.log(x));

// O(n²): everything × everything
for (const a of arr) for (const b of arr) compare(a, b);

// O(log n): halve the search space each step (sorted data!)
function binarySearch(sorted, target) {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
\`\`\`

**Space complexity** counts extra memory: sorting in place is O(1) space; building a copy is O(n). The classic trade: a hash map burns O(n) memory to buy O(1) lookups instead of O(n) scans.

**Rules of thumb:** drop constants (O(2n) → O(n)); keep the worst term (O(n² + n) → O(n²)); nested loops over the same input usually mean n².

Run the timers below and watch the growth.`,
      starter: `// Watch growth classes with real counters
function countOps(n) {
  let linear = 0, quadratic = 0, logSteps = 0;

  for (let i = 0; i < n; i++) linear++;                    // O(n)

  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) quadratic++; // O(n²)

  for (let x = n; x > 1; x = Math.floor(x / 2)) logSteps++; // O(log n)

  return { n, linear, quadratic, logSteps };
}

[10, 100, 1000].forEach((n) => console.log(countOps(n)));`,
      check: {
        expr: "output.includes('quadratic: 1000000') || output.includes('1000000')",
        hint: "At n=1000 the quadratic counter must hit 1,000,000 — n² operations.",
      },
      quiz: [
        {
          q: "Binary search is O(log n) because…",
          options: [
            "It's recursive",
            "Each comparison halves the remaining search space",
            "It uses no memory",
            "Arrays are fast",
          ],
          answer: 1,
          explanation:
            "Halving repeatedly means ~log₂(n) comparisons — 1M items ≈ 20 steps.",
        },
        {
          q: "Simplify: O(2n² + 500n + 3)",
          options: ["O(2n²)", "O(n²)", "O(n)", "O(503)"],
          answer: 1,
          explanation: "Drop constants and lower-order terms — n² dominates as n grows.",
        },
        {
          q: "Nested loops over the same n-element array are typically…",
          options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
          answer: 2,
          explanation: "n iterations × n inner iterations = n².",
        },
        {
          q: "A hash map trades ___ for O(1) lookups.",
          options: ["CPU cycles", "O(n) extra memory", "Type safety", "Nothing"],
          answer: 1,
          explanation: "Space-for-time: the map stores everything to find anything instantly.",
        },
        {
          q: "Which is NOT affected by Big-O?",
          options: [
            "Growth as input scales",
            "Absolute runtime on one machine",
            "Algorithm choice at 10M items",
            "Whether it dies at scale",
          ],
          answer: 1,
          explanation:
            "Big-O abstracts hardware away — it compares growth, not stopwatch times.",
        },
      ],
    },
    {
      id: "hash-maps",
      title: "Hash Maps: The O(1) Cheat Code",
      minutes: 9,
      body: `A **hash map** (\`Map\`/\`{}\` in JS) converts key → bucket via a hash function, making lookups, inserts, deletes ~O(1) average.

\`\`\`
const ages = new Map();
ages.set("ada", 36);
ages.get("ada");     // 36
ages.has("lin");     // false
\`\`\`

**The pattern that solves half of easy interview questions:** trade a second scan for a lookup.

\`\`\`
// Two Sum — O(n²) nested loop becomes O(n):
function twoSum(nums, target) {
  const seen = new Map();                  // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}
\`\`\`

Same trick counts things (frequency maps), dedupes (\`Set\`), and groups (\`key → array\`).

**Caveats:** worst case is O(n) on hash collisions (rare with good hashing); keys lose insertion order in plain \`{}\` (use \`Map\` when order matters); objects only allow string keys, \`Map\` allows anything.

Task: find the first duplicate with a \`Set\` in one pass.`,
      starter: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}
console.log("twoSum([2,7,11,15], 9) →", JSON.stringify(twoSum([2, 7, 11, 15], 9)));

// TODO: firstDuplicate returns the first value seen twice, else null
// one pass with a Set — O(n)
function firstDuplicate(nums) {
  // your code
  return null;
}

console.log("firstDuplicate([3,1,3,2]) →", firstDuplicate([3, 1, 3, 2]));       // 3
console.log("firstDuplicate([1,2,3]) →", firstDuplicate([1, 2, 3]));           // null`,
      check: {
        expr: "output.includes('[0,1]') && output.includes('firstDuplicate([3,1,3,2]) → 3') && output.includes('firstDuplicate([1,2,3]) → null')",
        hint: "In firstDuplicate, return num when the Set already has it — otherwise add and continue.",
      },
      quiz: [
        {
          q: "Average hash map lookup is…",
          options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
          answer: 2,
          explanation: "Hashing jumps straight to the bucket — constant time on average.",
        },
        {
          q: "The two-sum trick works by…",
          options: [
            "Sorting first",
            "Storing seen values and checking if the complement was seen",
            "Nested loops",
            "Binary searching each pair",
          ],
          answer: 1,
          explanation:
            "One pass, remember what you've seen, ask 'have I met my complement yet?'",
        },
        {
          q: "A Set is the right tool for…",
          options: ["Ordered data", "Membership tests and dedupe", "Key→value data", "Sorting"],
          answer: 1,
          explanation: "Set = values only, has() in O(1) — perfect for 'seen already?' checks.",
        },
        {
          q: "Map vs {} — which preserves insertion order and allows any key type?",
          options: ["{}", "Map", "Both", "Neither"],
          answer: 1,
          explanation: "Map guarantees order and takes any keys; {} coerces keys to strings.",
        },
        {
          q: "Hash map worst case is O(n) due to…",
          options: ["Garbage collection", "Collisions putting many keys in one bucket", "Async I/O", "Memory leaks"],
          answer: 1,
          explanation: "Pathological collisions degrade to scanning a bucket chain.",
        },
      ],
    },
    {
      id: "linked-lists-stacks-queues",
      title: "Linked Lists, Stacks & Queues",
      minutes: 10,
      reading: true,
      body: `**Linked list** — nodes pointing to nodes. O(1) insert/delete *once you're there*; O(n) to reach index i (no random access). Versus arrays: O(1) index, O(n) middle insert.

\`\`\`
class Node {
  constructor(value) { this.value = value; this.next = null; }
}
// walk: let cur = head; while (cur) { cur = cur.next; }
\`\`\`

The classic interview move is **two pointers**: fast moves 2, slow moves 1 — when fast hits the end, slow is at the middle; if fast loops back around to slow, there's a **cycle**.

**Stack** — LIFO. \`push\`/\`pop\` from the top. Powers undo, the call stack, matching brackets, DFS.

\`\`\`
// valid brackets in O(n):
function isBalanced(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (stack.pop() !== pairs[ch]) return false;
  }
  return stack.length === 0;
}
\`\`\`

**Queue** — FIFO. \`enqueue\` back, \`dequeue\` front. Powers task scheduling, BFS, message buffers.

**Deque** (double-ended) does both ends in O(1) — it's the sliding-window maximum tool.

Choosing: index-heavy → array; front/back-heavy → deque; undo/backtracking → stack; fair ordering → queue.`,
      quiz: [
        {
          q: "Array vs linked list for inserting at the front?",
          options: [
            "Array O(1), list O(n)",
            "List O(1), array O(n) — everything shifts",
            "Both O(1)",
            "Both O(n log n)",
          ],
          answer: 1,
          explanation:
            "Lists relink a pointer; arrays shift every element one slot.",
        },
        {
          q: "Fast & slow pointers detect cycles because…",
          options: [
            "Fast eventually laps slow inside the cycle",
            "Slow speeds up",
            "The list sorts itself",
            "JavaScript magic",
          ],
          answer: 0,
          explanation:
            "Inside a loop, the gap closes every step — they must meet.",
        },
        {
          q: "The bracket-matching stack works because closers must match…",
          options: [
            "Any opener",
            "The most recent unclosed opener (LIFO)",
            "The first opener (FIFO)",
            "Nothing",
          ],
          answer: 1,
          explanation: "Nesting is last-opened-first-closed — exactly a stack.",
        },
        {
          q: "BFS uses a ___, DFS uses a ___ (explicitly or the call stack).",
          options: ["stack, queue", "queue, stack", "heap, map", "list, set"],
          answer: 1,
          explanation: "FIFO explores level by level; LIFO dives deep first.",
        },
        {
          q: "Undo functionality is a natural…",
          options: ["Queue", "Stack", "Heap", "Tree"],
          answer: 1,
          explanation: "Most recent action reverts first — LIFO.",
        },
      ],
    },
    {
      id: "trees-recursion",
      title: "Trees & Recursion",
      minutes: 11,
      reading: true,
      body: `A **binary tree** is recursion made visible: every node is a tiny tree of left subtree + right subtree.

\`\`\`
class TreeNode {
  constructor(val) { this.val = val; this.left = null; this.right = null; }
}
\`\`\`

**Recursion recipe:** (1) base case, (2) trust the function on smaller inputs, (3) combine.

function height(node) {
  if (!node) return 0;                                        // base
  return 1 + Math.max(height(node.left), height(node.right)); // recurse + combine
}
\`\`\`

**Traversals** — where you *visit* determines the order:

- **DFS preorder** (node → L → R): copy/serialize trees
- **DFS inorder** (L → node → R): sorted order in a *BST*!
- **DFS postorder** (L → R → node): delete/measure children first
- **BFS level-order** (queue): shortest paths, level sums

function inorder(node, out = []) {
  if (!node) return out;
  inorder(node.left, out);
  out.push(node.val);
  inorder(node.right, out);
  return out;
}
\`\`\`

**Binary Search Tree** invariant: left < node < right → search/insert/delete in O(log n) *if balanced*; degenerates to O(n) when it becomes a linked list (insert sorted data). Self-balancing trees (AVL, red-black) fix that — that's what databases actually use.

**Recursion cost:** each call is a stack frame. Depth 10k? Stack overflow. That's why level-order uses an explicit queue instead.`,
      quiz: [
        {
          q: "Inorder traversal of a BST yields…",
          options: ["Reverse order", "Sorted order", "Level order", "Random order"],
          answer: 1,
          explanation: "Left-smaller, node, right-bigger — visiting in that order sorts.",
        },
        {
          q: "Every recursive function needs…",
          options: ["A loop", "A base case", "Global state", "Tail calls"],
          answer: 1,
          explanation: "Without the base case, recursion never stops unwinding.",
        },
        {
          q: "Tree height recursive solution is…",
          options: [
            "1 + max(height(left), height(right))",
            "height(left) + height(right)",
            "left.val + right.val",
            "A BFS with a queue only",
          ],
          answer: 0,
          explanation: "Height = 1 + the taller subtree, recursively.",
        },
        {
          q: "A BST given sorted input becomes…",
          options: ["Balanced", "A linked list — O(n) search", "A heap", "Empty"],
          answer: 1,
          explanation: "Every node has one child; the O(log n) invariant dies.",
        },
        {
          q: "Level-order traversal is implemented with a…",
          options: ["Stack", "Queue", "Map", "Recursion only"],
          answer: 1,
          explanation: "BFS needs FIFO order — a queue.",
        },
      ],
    },
    {
      id: "sorting",
      title: "Sorting: Merge & Quick Sort",
      minutes: 10,
      // Tier 3 conversion (V2 §9 / §8.4): "implement merge sort from memory"
      // is a recall exercise. The DebugLab below is the judgment version —
      // judge a generated sort for worst-case behaviour instead of
      // reproducing one. The merge/quick concepts stay in the reading.
      debug: debugChallenge("ai-sort-comparator"),
      body: `Comparison sorting's ceiling is **O(n log n)** — both flagship algorithms hit it, with opposite philosophies.

**Merge sort** — divide, sort halves, **merge**. Stable, predictable O(n log n) *always*, O(n) extra space.

\`\`\`
function mergeSort(arr) {
  if (arr.length <= 1) return arr;                    // base
  const mid = arr.length >> 1;
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)));
}
function merge(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    out.push(a[i] <= b[j] ? a[i++] : b[j++]);  // <= keeps it stable
  }
  return [...out, ...a.slice(i), ...b.slice(j)];
}
\`\`\`

**Quick sort** — pick a **pivot**, partition smaller|larger, recurse. In-place (O(log n) space), *typically* faster, but **O(n²) worst case** on bad pivots (sorted input + first-element pivot). Randomize the pivot and that's rare in practice.

function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const [pivot, ...rest] = arr;
  return [
    ...quickSort(rest.filter((x) => x < pivot)),
    pivot,
    ...quickSort(rest.filter((x) => x >= pivot)),
  ];
}
\`\`\`

Trace merge sort on [5,2,8,1] below, then benchmark both.`,
      starter: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)));
}
function merge(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  }
  return [...out, ...a.slice(i), ...b.slice(j)];
}

function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const [pivot, ...rest] = arr;
  return [
    ...quickSort(rest.filter((x) => x < pivot)),
    pivot,
    ...quickSort(rest.filter((x) => x >= pivot)),
  ];
}

const data = [5, 2, 8, 1, 9, 3];
console.log("merge:", JSON.stringify(mergeSort(data)));
console.log("quick:", JSON.stringify(quickSort(data)));

// TODO: build a 1000-item array, sort with both, and print the first 5`,
      check: {
        expr: "output.includes('merge: [1,2,3,5,8,9]') && output.includes('quick: [1,2,3,5,8,9]') && output.includes('big merge ok:')",
        hint: "Both sorts must print the sorted six-number array and the sorted big-array preview.",
      },
      quiz: [
        {
          q: "Merge sort's space complexity is…",
          options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
          answer: 2,
          explanation: "Merging needs a buffer the size of the input.",
        },
        {
          q: "Quick sort's worst case happens with…",
          options: [
            "Random pivots",
            "Consistently bad pivots (e.g., sorted input, first-element pivot)",
            "Odd lengths",
            "Small arrays",
          ],
          answer: 1,
          explanation: "Maximally unbalanced partitions recurse n times → O(n²).",
        },
        {
          q: "Which sort is stable by construction here?",
          options: ["Quick sort", "Merge sort (the <= in merge)", "Both", "Neither"],
          answer: 1,
          explanation:
            "Taking from the left half on ties preserves original order — that's stability.",
        },
        {
          q: "Both algorithms achieve O(n log n) via…",
          options: [
            "Hashing",
            "Divide and conquer — log n levels of n work",
            "Bubble passes",
            "Binary search",
          ],
          answer: 1,
          explanation: "Halving the problem log n times, doing linear work per level.",
        },
        {
          q: "You need guaranteed O(n log n) with stability. Pick…",
          options: ["Quick sort", "Merge sort", "Bubble sort", "Selection sort"],
          answer: 1,
          explanation: "Merge sort is stable and never degrades — that's why libraries use hybrids of it (Timsort).",
        },
      ],
    },
    {
      id: "patterns-two-pointer",
      title: "Patterns: Two Pointers & Sliding Window",
      minutes: 10,
      body: `Interview problems reward **pattern recognition** over memorization. Two workhorses:

**Two pointers** on sorted arrays — move ends inward based on a comparison. Turns O(n²) pair scans into O(n):

\`\`\`
// pair summing to target in a SORTED array
function pairWithSum(sorted, target) {
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;   // need bigger
    else hi--;                // need smaller
  }
  return null;
}
\`\`\`

**Sliding window** for contiguous subarrays — grow the right edge, shrink the left when a constraint breaks. O(n): each index enters and leaves once.

// longest substring without repeating characters
function longestUnique(s) {
  const seen = new Map();   // char -> last index
  let best = 0, start = 0;
  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    if (seen.has(ch) && seen.get(ch) >= start) start = seen.get(ch) + 1;
    seen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
}
\`\`\`

**Signal phrases:** "sorted array, find a pair" → two pointers. "longest/shortest subarray satisfying X" → sliding window. "contiguous sum equals k" → window or prefix sums. "top k / most frequent" → hash map + heap.`,
      starter: `function pairWithSum(sorted, target) {
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;
    else hi--;
  }
  return null;
}
console.log("pair([1,3,5,8,12], 13) →", JSON.stringify(pairWithSum([1, 3, 5, 8, 12], 13)));

// TODO: sliding window — max sum of any k consecutive elements
function maxWindowSum(nums, k) {
  // sum the first k, then slide: add the incoming, drop the outgoing
  return 0;
}
console.log("maxWindowSum([2,1,5,1,3,2], 3) →", maxWindowSum([2, 1, 5, 1, 3, 2], 3)); // 9
console.log("maxWindowSum([1,9,2,8], 2) →", maxWindowSum([1, 9, 2, 8], 2));          // 11`,
      check: {
        expr: "output.includes('[1,4]') && output.includes('maxWindowSum([2,1,5,1,3,2], 3) → 9') && output.includes('maxWindowSum([1,9,2,8], 2) → 11')",
        hint: "maxWindowSum: seed with the first k-sum, then for i≥k add nums[i] and subtract nums[i-k]; track the max.",
      },
      quiz: [
        {
          q: "Two pointers on a sorted array beats nested loops by…",
          options: [
            "Caching",
            "Eliminating one scan — O(n) vs O(n²)",
            "Using recursion",
            "Sorting again",
          ],
          answer: 1,
          explanation:
            "Each comparison moves a pointer; n moves total, not n².",
        },
        {
          q: "When the window sum is too big, you…",
          options: [
            "Grow the right edge",
            "Shrink from the left",
            "Restart",
            "Sort the window",
          ],
          answer: 1,
          explanation:
            "Constraint violated → contract from the left until valid again.",
        },
        {
          q: "Sliding window is O(n) because…",
          options: [
            "It uses a Map",
            "Both edges only move forward — each element enters/leaves once",
            "It skips elements",
            "It's recursive",
          ],
          answer: 1,
          explanation: "2n pointer moves at most → amortized O(1) per element.",
        },
        {
          q: "'Longest substring with at most K distinct chars' is a classic…",
          options: ["Binary search", "Sliding window", "DFS", "Heap problem"],
          answer: 1,
          explanation: "Grow/shrink a window while tracking distinct counts in a map.",
        },
        {
          q: "Two pointers require the array to be…",
          options: ["Any order", "Sorted (or the logic gives wrong answers)", "Unique values", "Numeric only"],
          answer: 1,
          explanation:
            "The inward decisions depend on order — unsorted breaks the invariant.",
        },
      ],
    },
    {
      id: "graphs-bfs-dfs",
      title: "Graphs: BFS & DFS",
      minutes: 12,
      body: `A **graph** is nodes + edges — social networks, maps, dependencies. Store it as an adjacency list:

\`\`\`
const graph = new Map();
function addEdge(a, b) {
  if (!graph.has(a)) graph.set(a, []);
  if (!graph.has(b)) graph.set(b, []);
  graph.get(a).push(b);
  graph.get(b).push(a); // undirected
}
\`\`\`

**Two traversals, two souls:**

**BFS** — a queue. Explores in rings: all distance-1 nodes, then distance-2… This is why BFS finds **shortest paths in unweighted graphs**.

\`\`\`
function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const nb of graph.get(node) ?? []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }
  return order;
}
\`\`\`

**DFS** — a stack (or recursion, which IS a stack). Dives deep before backing up. Great for cycle detection, topological sort, connected components.

\`\`\`
function dfs(graph, node, visited = new Set(), order = []) {
  visited.add(node);
  order.push(node);
  for (const nb of graph.get(node) ?? []) {
    if (!visited.has(nb)) dfs(graph, nb, visited, order);
  }
  return order;
}
\`\`\`

**The shared skeleton:** visited-set + frontier (queue vs stack) + neighbor loop. Both are O(V + E).

**Signal phrases:** "fewest steps/moves" → BFS. "all paths / detect cycle / count regions" → DFS. "weighted shortest path" → Dijkstra (BFS with a priority queue).`,
      starter: `const graph = new Map();
function addEdge(a, b) {
  if (!graph.has(a)) graph.set(a, []);
  if (!graph.has(b)) graph.set(b, []);
  graph.get(a).push(b);
  graph.get(b).push(a);
}

[["A","B"], ["A","C"], ["B","D"], ["C","E"], ["D","E"]].forEach(
  ([a, b]) => addEdge(a, b)
);

function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const nb of graph.get(node) ?? []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }
  return order;
}

function dfs(graph, node, visited = new Set(), order = []) {
  visited.add(node);
  order.push(node);
  for (const nb of graph.get(node) ?? []) {
    if (!visited.has(nb)) dfs(graph, nb, visited, order);
  }
  return order;
}

console.log("BFS from A:", bfs(graph, "A").join(" "));
console.log("DFS from A:", dfs(graph, "A").join(" "));

// TODO: shortest path length from A to E (BFS level counting)
function shortestDist(graph, start, end) {
  // track (node, distance) pairs in the queue
  return -1;
}
console.log("shortest A→E:", shortestDist(graph, "A", "E")); // count the hops — shortest is 2`,
      check: {
        expr: "output.includes('BFS from A: A B C D E') && output.includes('shortest A→E: 2')",
        hint: "BFS visits rings outward (A, then B and C, then D and E). Count edges, not nodes: A→C→E is 2 hops, while A→B→D→E is 3. Expect 2.",
      },
      predict: [
        {
          prompt: "Given edges A-B, A-C, B-D — what does this BFS from A print?",
          code: `const graph = new Map([
  ["A", ["B", "C"]],
  ["B", ["D"]],
  ["C", []],
  ["D", []],
]);
function bfs(g, start) {
  const seen = new Set([start]);
  const q = [start];
  const out = [];
  while (q.length) {
    const n = q.shift();
    out.push(n);
    for (const nb of g.get(n) ?? []) {
      if (!seen.has(nb)) { seen.add(nb); q.push(nb); }
    }
  }
  return out;
}
console.log(bfs(graph, "A").join(""));`,
          options: ["ABDC", "ABCD — ring by ring: A, then B and C, then D", "ADBC", "ACBD"],
          answer: 1,
          explanation:
            "The queue processes A (enqueues B, C), then B (enqueues D), then C, then D. FIFO order is what makes BFS explore in rings — and find shortest paths first.",
        },
        {
          prompt: "What does this DFS from A print with the same graph?",
          code: `// graph: A→[B, C], B→[D]
function dfs(g, n, seen = new Set(), out = []) {
  seen.add(n);
  out.push(n);
  for (const nb of g.get(n) ?? []) {
    if (!seen.has(nb)) dfs(g, nb, seen, out);
  }
  return out;
}
// adjacency: A:[B,C], B:[D], C:[], D:[]
console.log("order computed at runtime");`,
          options: [
            "ABDC — the neighbor loop visits B fully (and its D) before C",
            "ACBD",
            "ABCD",
            "ADBC",
          ],
          answer: 0,
          explanation:
            "DFS dives: A → B → D (dead end) → back up → C. Same nodes as BFS, opposite order of exploration — swap the queue for a stack and you switch algorithms.",
        },
      ],
      quiz: [
        {
          q: "BFS finds shortest paths when…",
          options: [
            "Edges have weights",
            "All edges have equal weight (unweighted graphs)",
            "The graph is a tree",
            "Never",
          ],
          answer: 1,
          explanation:
            "Ring-by-ring exploration means the first arrival is the fewest-hops path.",
        },
        {
          q: "The data structure difference: BFS uses ___, DFS uses ___.",
          options: ["stack, queue", "queue, stack", "heap, set", "map, array"],
          answer: 1,
          explanation:
            "FIFO breadth vs LIFO depth — everything else is identical.",
        },
        {
          q: "Recursion-based DFS relies on…",
          options: ["The heap", "The call stack as its stack", "A Map", "The event loop"],
          answer: 1,
          explanation: "Each call frame is a pending 'return here' — a stack.",
        },
        {
          q: "Without a visited set, traversal on a cyclic graph…",
          options: [
            "Skips nodes",
            "Loops forever",
            "Sorts the graph",
            "Works fine",
          ],
          answer: 1,
          explanation: "Cycles mean you can revisit nodes infinitely — mark everything you've seen.",
        },
        {
          q: "'Minimum number of moves in a maze' is a classic…",
          options: ["DFS", "BFS", "Quick sort", "Hash map"],
          answer: 1,
          explanation:
            "Fewest moves = shortest unweighted path = BFS.",
        },
      ],
    },
    {
      id: "dp-intro",
      title: "Dynamic Programming: Overlapping Subproblems",
      minutes: 11,
      body: `**DP = recursion + memory.** When a recursive problem re-asks the same subquestions, cache the answers.

The canonical climb: fibonacci.

// O(2^n) — recomputes fib(3) a million times
function fib(n) { return n < 2 ? n : fib(n-1) + fib(n-2); }

// memoized — O(n) time, O(n) space
function fib(n, memo = new Map()) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const v = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, v);
  return v;
}

// bottom-up tabulation — O(n) time, O(1) space
function fibTab(n) {
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return n === 0 ? 0 : b;
}
\`\`\`

**The DP checklist:**
1. **State** — what does \`dp[i]\` *mean*? ("min cost to reach step i")
2. **Transition** — how do states combine? (\`dp[i] = cost[i] + min(dp[i-1], dp[i-2])\`)
3. **Base cases** — the smallest truths
4. **Order** — compute dependencies first

// min climbing cost: you may start at step 0 or 1, climb 1-2 steps
function minCostClimbing(cost) {
  let prev = 0, curr = 0;
  for (const c of cost) [prev, curr] = [curr, c + Math.min(prev, curr)];
  return Math.min(prev, curr);
}
\`\`\`

**Signals you're in DP land:** "count the ways", "min/max cost", "can you reach", and the brute force is exponential but the *distinct states* are few.`,
      starter: `function fibNaive(n) { return n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2); }

function fibMemo(n, memo = new Map()) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const v = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, v);
  return v;
}

function fibTab(n) {
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return n === 0 ? 0 : b;
}

let calls = 0;
function fibCounting(n) { calls++; return n < 2 ? n : fibCounting(n - 1) + fibCounting(n - 2); }
fibCounting(20);
console.log("naive fib(20) needed", calls, "function calls");

console.log("fibMemo(60) =", fibMemo(60));
console.log("fibTab(60) =", fibTab(60));

// TODO: coinChange(coins, amount) → fewest coins summing to amount, or -1
function coinChange(coins, amount) {
  // dp[0]=0; dp[a] = 1 + min(dp[a-coin]) over coins <= a
  return -1;
}
console.log("coinChange([1,2,5], 11) →", coinChange([1, 2, 5], 11)); // 3 (5+5+1)
console.log("coinChange([2], 3) →", coinChange([2], 3));             // -1`,
      check: {
        expr: "output.includes('needed 13529') && output.includes('coinChange([1,2,5], 11) → 3') && output.includes('coinChange([2], 3) → -1')",
        hint: "coinChange: fill dp[1..amount]; unreachable stays Infinity → return -1.",
      },
      quiz: [
        {
          q: "Memoization converts exponential recursion to…",
          options: [
            "O(n log n) always",
            "O(number of distinct states × cost per state)",
            "O(1)",
            "It stays exponential",
          ],
          answer: 1,
          explanation:
            "Each state computes once — the state space size times the work per state.",
        },
        {
          q: "The DP 'state' is…",
          options: [
            "The function name",
            "A precise definition of what dp[i] means",
            "The input array",
            "The cache key only",
          ],
          answer: 1,
          explanation:
            "Nailing the state definition is 80% of solving a DP problem.",
        },
        {
          q: "Bottom-up (tabulation) vs memoization: tabulation usually…",
          options: [
            "Uses more space",
            "Avoids recursion overhead and can drop unused dimensions",
            "Is always slower",
            "Can't handle base cases",
          ],
          answer: 1,
          explanation:
            "Iterative fills let you keep only the last k rows — fib needs two variables.",
        },
        {
          q: "coinChange([1,2,5], 11) = 3 because…",
          options: [
            "Greedy 5+5+1 is provably optimal for this coin set",
            "dp[11] = 1 + min(dp[10], dp[9], dp[6]) = 1 + 2",
            "11/5 rounds to 2",
            "It's not solvable",
          ],
          answer: 1,
          explanation:
            "The transition considers every last coin; DP guards against greedy's edge cases.",
        },
        {
          q: "Which phrase signals DP?",
          options: [
            "Find in a sorted array",
            "Count the number of distinct ways to…",
            "Detect a cycle",
            "Parse HTML",
          ],
          answer: 1,
          explanation:
            "'Count ways / min cost / max value' with overlapping subproblems = DP.",
        },
      ],
    },
  ],
};
