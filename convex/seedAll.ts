import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

const EXAMPLE_PASSWORD = "WcsDemo-2026!";
const EXAMPLE_ACCOUNTS = [
  { email: "fixture-admin@wcsmontpellier.invalid", name: "Administrateur de démonstration" },
  { email: "fixture-contributor-a@wcsmontpellier.invalid", name: "Contribution Démo A" },
  { email: "fixture-contributor-b@wcsmontpellier.invalid", name: "Contribution Démo B" },
  { email: "fixture-user@wcsmontpellier.invalid", name: "Membre de démonstration" },
] as const;

export const run = internalAction({
  args: {},
  returns: v.object({
    accounts: v.array(v.object({ email: v.string(), created: v.boolean() })),
    actors: v.number(),
    places: v.number(),
    classes: v.number(),
    events: v.number(),
    occurrences: v.number(),
  }),
  handler: async (ctx): Promise<{
    accounts: Array<{ email: string; created: boolean }>;
    actors: number;
    places: number;
    classes: number;
    events: number;
    occurrences: number;
  }> => {
    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(siteUrl)) {
      throw new Error("Example accounts may only be seeded into a local Convex deployment.");
    }
    const accounts: Array<{ email: string; created: boolean }> = [];
    for (const account of EXAMPLE_ACCOUNTS) {
      const shouldCreate: boolean = await ctx.runMutation(internal.seed.prepareExampleAccount, { email: account.email });
      if (shouldCreate) {
        await ctx.runAction(api.auth.signIn, {
          provider: "password",
          params: { flow: "signUp", email: account.email, password: EXAMPLE_PASSWORD, name: account.name },
          calledBy: "seedAll:run",
        });
      }
      accounts.push({ email: account.email, created: shouldCreate });
    }
    const data = await ctx.runMutation(internal.seed.seedDemoData, {});
    return { accounts, ...data };
  },
});
