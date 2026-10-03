// Registers the provider Convex uses to verify Convex Auth session JWTs.
// Without this bundle every request fails with `NoAuthProvider`.
//
// The domain is resolved when the CLI *pushes* this file, not at request time.
// If `CONVEX_SITE_URL` is missing from the push environment the provider ends
// up with `domain: undefined`, Convex silently reports "no providers
// configured", and every sign-in appears to succeed while the app never sees a
// user. The deployment's site URL is a public endpoint (the client already
// commits it in AccountProvider), so fall back to it explicitly.
const SITE_URL =
  process.env.CONVEX_SITE_URL ??
  // Hard-coded fallback so the provider resolves even if the push
  // environment lacks CONVEX_SITE_URL (this is the public site URL).
  "https://accomplished-hyena-726.convex.site";

export default {
  providers: [
    {
      domain: SITE_URL,
      // Matches the `aud` claim Convex Auth issues.
      applicationID: "convex",
    },
  ],
};
