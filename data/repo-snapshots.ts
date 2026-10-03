import type { RepoExercise } from "./types";

/* ═══════════════════════════════════════════════════════════════
   Repo snapshots for the archaeology lab (V2.1 Fix 3).

   A codebase the learner has never seen, small enough to read end
   to end: entry → route → service → data, plus a worker. The
   questions ask for a hop, the callers of a function, and a rename's
   blast radius — the three scoping questions a junior is paid to
   answer before changing anything.
   ═══════════════════════════════════════════════════════════════ */

export const SHOP_API: RepoExercise = {
  id: "shop-api",
  title: "Codebase Archaeology: A Shop API You've Never Seen",
  brief:
    "Six files, one request path. Trace it directly — an agent will happily draw you a confident, wrong map; yours has to be checkable.",
  files: [
    {
      path: "server.ts",
      content: `import express from "express";
import { ordersRouter } from "./src/routes/orders";

export function createServer() {
  const app = express();
  app.use(express.json());
  app.use("/orders", ordersRouter);
  return app;
}`,
    },
    {
      path: "src/routes/orders.ts",
      content: `import { Router } from "express";
import { formatPrice } from "../lib/money";
import { findOrder, listOrders as listOrderRows } from "../db/orders";
import { markOrderPaid, summarize } from "../services/orders";

export const ordersRouter = Router();

// The route layer translates HTTP to function calls. It owns no rules.
ordersRouter.get("/", listOrders);
ordersRouter.get("/:id", getOrder);
ordersRouter.post("/:id/pay", payOrder);

async function listOrders(_req, res) {
  const rows = await listOrderRows();
  res.json(
    rows.map((order) => ({
      id: order.id,
      status: order.status,
      total: formatPrice(order.total),
    }))
  );
}

async function getOrder(req, res) {
  const order = await findOrder(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(summarize(order));
}

async function payOrder(req, res) {
  await markOrderPaid(Number(req.params.id));
  res.json({ ok: true });
}`,
    },
    {
      path: "src/services/orders.ts",
      content: `import { findOrder, updateOrderStatus } from "../db/orders";

/**
 * The business rule for payment: load the order, decide, then update.
 * Already-paid is a no-op; missing orders do nothing.
 */
export async function markOrderPaid(id: number) {
  const order = await findOrder(id);
  if (!order) return false;
  if (order.status === "paid") return true;
  return updateOrderStatus(id, "paid");
}

/** Shapes an order for the API. */
export function summarize(order: { id: number; status: string; total: number }) {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.total,
  };
}`,
    },
    {
      path: "src/db/orders.ts",
      content: `/** In-memory stand-in for the orders table. */
export async function listOrders() {
  return [
    { id: 101, status: "pending", total: 4599 },
    { id: 102, status: "paid", total: 1899 },
  ];
}

export async function findOrder(id: number) {
  const rows = await listOrders();
  return rows.find((row) => row.id === id) ?? null;
}

export async function updateOrderStatus(id: number, status: string) {
  if (!id) throw new Error("id required");
  return status === "paid";
}`,
    },
    {
      path: "src/lib/money.ts",
      content: `/** Formats a cent amount for display. Currency-agnostic on purpose. */
export function formatPrice(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}`,
    },
    {
      path: "workers/email.ts",
      content: `import { formatPrice } from "../lib/money";

/** Builds the receipt line sent after an order is paid. */
export function sendReceipt(order: { id: number; status: string; total: number }) {
  return "Order #" + order.id + " — " + formatPrice(order.total);
}`,
    },
  ],
  questions: [
    {
      kind: "locate",
      prompt:
        "POST /orders/:id/pay flips the order's status. Which function owns that rule — loads the order, decides, then updates?",
      choices: [
        { file: "server.ts", symbol: "createServer" },
        { file: "src/routes/orders.ts", symbol: "listOrders" },
        { file: "src/routes/orders.ts", symbol: "payOrder" },
        { file: "src/services/orders.ts", symbol: "markOrderPaid" },
        { file: "src/services/orders.ts", symbol: "summarize" },
        { file: "src/db/orders.ts", symbol: "listOrders" },
        { file: "src/db/orders.ts", symbol: "updateOrderStatus" },
        { file: "src/lib/money.ts", symbol: "formatPrice" },
        { file: "workers/email.ts", symbol: "sendReceipt" },
      ],
      answer: { file: "src/services/orders.ts", symbol: "markOrderPaid" },
      why: "The route only delegates. markOrderPaid() loads the order, applies the rule (already paid is a no-op), and performs the update through the DB layer. Finding the layer that owns a rule — not the one that owns the URL — is the whole point of the trace.",
    },
    {
      kind: "select",
      prompt: "Which code paths call formatPrice()? Select every true caller.",
      options: [
        { label: "src/routes/orders.ts → listOrders()", correct: true },
        { label: "workers/email.ts → sendReceipt()", correct: true },
        { label: "src/services/orders.ts → markOrderPaid()", correct: false },
        { label: "src/lib/money.ts → formatPrice()", correct: false },
        { label: "src/db/orders.ts → listOrders()", correct: false },
      ],
      why: "The listing route formats each row's total for the API response, and the receipt worker formats it for the email line. money.ts is the definition, not a caller — a grep hit that is not a call site. The service and the raw DB read never touch display formatting.",
    },
    {
      kind: "select",
      prompt:
        "Order.total is about to be renamed amountCents. Which files must change in the same rename?",
      options: [
        { label: "server.ts", correct: false },
        { label: "src/routes/orders.ts", correct: true },
        { label: "src/services/orders.ts", correct: true },
        { label: "src/db/orders.ts", correct: true },
        { label: "src/lib/money.ts", correct: false },
        { label: "workers/email.ts", correct: true },
      ],
      why: "Four files read or construct the field: the route formats it, the service summarizes it, the DB rows carry it, and the receipt worker formats it. server.ts only wires middleware; money.ts formats a cents number that could come from anywhere — it never names the field. That's a blast radius of four, not six.",
    },
  ],
};

export const REPO_SNAPSHOTS: RepoExercise[] = [SHOP_API];

export function repoSnapshot(id: string): RepoExercise {
  const found = REPO_SNAPSHOTS.find((r) => r.id === id);
  if (!found) {
    throw new Error(
      `Unknown repo snapshot "${id}" — add it to src/data/repo-snapshots.ts`
    );
  }
  return found;
}
