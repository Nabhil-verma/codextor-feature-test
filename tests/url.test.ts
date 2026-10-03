// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAbsoluteUrl, toAbsoluteUrl } from "../src/lib/url";

/*
 * The guard that stands between a hand-edited constant (or, historically, an
 * env var) and `new ConvexReactClient()`, which throws "Provided address was
 * not an absolute URL." from inside a constructor — the reported production
 * crash: the whole app went down with it. Anything unusable must turn into the
 * known-good address instead of an exception.
 */

const KNOWN_GOOD = "https://accomplished-hyena-726.convex.cloud";

describe("isAbsoluteUrl", () => {
  it("accepts absolute http(s) and ws(s) addresses", () => {
    expect(isAbsoluteUrl("https://accomplished-hyena-726.convex.cloud")).toBe(true);
    expect(isAbsoluteUrl("wss://example.convex.cloud/sync")).toBe(true);
    expect(isAbsoluteUrl("  https://example.com/path  ")).toBe(true);
  });

  it("rejects what actually caused the crash", () => {
    expect(isAbsoluteUrl(undefined)).toBe(false);
    expect(isAbsoluteUrl(null)).toBe(false);
    expect(isAbsoluteUrl("")).toBe(false);
    expect(isAbsoluteUrl("   ")).toBe(false);
    expect(isAbsoluteUrl("/api")).toBe(false);
    expect(isAbsoluteUrl("accomplished-hyena-726.convex.cloud")).toBe(false);
    expect(isAbsoluteUrl("localhost:3210")).toBe(false);
    expect(isAbsoluteUrl("https://")).toBe(false);
    expect(isAbsoluteUrl("https:// spaces .example.com")).toBe(false);
  });
});

describe("toAbsoluteUrl", () => {
  it("passes a valid address straight through", () => {
    expect(toAbsoluteUrl(KNOWN_GOOD, "https://fallback.example")).toBe(KNOWN_GOOD);
    expect(toAbsoluteUrl("https://a.example/x?y=1", "https://fallback.example")).toBe(
      "https://a.example/x?y=1"
    );
  });

  it("returns the fallback for missing, relative or malformed input", () => {
    for (const bad of [undefined, null, "", "   ", "accomplished-hyena-726.convex.cloud", 42]) {
      expect(toAbsoluteUrl(bad, KNOWN_GOOD, "https://codexter.example")).toBe(KNOWN_GOOD);
    }
  });

  it("resolves a relative path against the page origin", () => {
    expect(toAbsoluteUrl("/api/users", KNOWN_GOOD, "https://codexter.example")).toBe(
      "https://codexter.example/api/users"
    );
    expect(toAbsoluteUrl("./x", KNOWN_GOOD, "https://codexter.example/app/")).toBe(
      "https://codexter.example/app/x"
    );
    expect(toAbsoluteUrl("//cdn.example/x.js", KNOWN_GOOD, "https://codexter.example")).toBe(
      "https://cdn.example/x.js"
    );
  });

  it("never throws — a broken address is a value, not an exception", () => {
    const weird = ["%%%", "http://[", "javascript:alert(1)", "///", "\u0000"];
    for (const value of weird) {
      expect(() => toAbsoluteUrl(value, KNOWN_GOOD, "https://codexter.example")).not.toThrow();
      expect(typeof toAbsoluteUrl(value, KNOWN_GOOD, "https://codexter.example")).toBe("string");
    }
  });
});

/*
 * A hand-edited deployment name is how the crash started: the client's copy and
 * the auth provider's copy drifted (one read `accomplished-hyena-726`, the other
 * a misspelling of it), so sign-in pointed at a deployment that does not exist.
 * The addresses are literals in two files, so the only way to hold them together
 * is to read both and compare.
 */
describe("cloud addresses stay consistent", () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

  const literalAddresses = (source: string) =>
    [...source.matchAll(/https:\/\/([a-z0-9-]+)\.convex\.(?:cloud|site)/g)].map((m) => m[1]);

  it("the client and the auth provider name the same deployment", () => {
    const inClient = [
      ...literalAddresses(read("../src/AccountProvider.tsx")),
      // The primary address is built from this constant, so it counts too.
      /CONVEX_DEPLOYMENT = "([a-z0-9-]+)"/.exec(read("../src/AccountProvider.tsx"))?.[1],
    ].filter((v): v is string => !!v);
    const inAuth = literalAddresses(read("../src/convex/auth.config.ts"));

    expect(inClient.length).toBeGreaterThan(0);
    expect(inAuth.length).toBeGreaterThan(0);
    // One name on each side, and the same one: a typo'd twin fails here.
    expect(new Set(inClient).size).toBe(1);
    expect(new Set(inAuth).size).toBe(1);
    expect(inClient[0]).toBe(inAuth[0]);
  });

  it("every literal address would survive the guard", () => {
    const source = read("../src/AccountProvider.tsx") + read("../src/convex/auth.config.ts");
    for (const address of source.match(/https:\/\/[a-z0-9.-]+\.convex\.(?:cloud|site)/g) ?? []) {
      expect(isAbsoluteUrl(address)).toBe(true);
    }
  });
});
