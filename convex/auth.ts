import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Persist the display name chosen at sign-up directly on the user.
      profile: (params) => ({
        ...(params.name ? { name: String(params.name).trim().slice(0, 60) } : {}),
        email: params.email as string,
      }),
    }),
  ],
});
