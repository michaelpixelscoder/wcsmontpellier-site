import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        const suppliedName = typeof params.name === "string" ? params.name.trim() : "";
        const displayName = suppliedName || email.split("@")[0] || "Danseur·euse";
        return {
          email,
          name: displayName,
          displayName,
          role: "user",
          status: "active",
          updatedAt: Date.now(),
        };
      },
    }),
  ],
  callbacks: {
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (user?.status === "suspended" || user?.status === "deleted") {
        throw new Error("Ce compte n’est pas actif.");
      }
      await ctx.db.patch(userId, {
        role: user?.role ?? "user",
        status: user?.status ?? "active",
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      });
    },
  },
});
