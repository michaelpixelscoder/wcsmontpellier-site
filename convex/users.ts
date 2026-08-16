import { v } from "convex/values";
import {
  authenticatedMutation,
  authenticatedQuery,
  type AppRole,
} from "./lib/authorization";

const role = v.union(
  v.literal("user"),
  v.literal("contributor"),
  v.literal("administrator"),
);

export const me = authenticatedQuery({
  args: {},
  returns: v.object({
    id: v.id("users"),
    displayName: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    role,
  }),
  handler: async (ctx) => ({
    id: ctx.user._id,
    displayName: ctx.user.displayName ?? ctx.user.name ?? null,
    email: ctx.user.email ?? null,
    image: ctx.user.image ?? null,
    role: ctx.user.role,
  }),
});

export const ensureProfile = authenticatedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const patch: {
      displayName?: string;
      role: AppRole;
      status: "active";
      updatedAt: number;
    } = {
      role: ctx.user.role,
      status: "active",
      updatedAt: Date.now(),
    };

    if (ctx.user.displayName === undefined && ctx.user.name !== undefined) {
      patch.displayName = ctx.user.name;
    }
    await ctx.db.patch("users", ctx.user._id, patch);
    return null;
  },
});
