import { ConvexError, v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { administratorMutation, administratorQuery, type ActiveUser } from "./lib/authorization";

const role = v.union(v.literal("user"), v.literal("contributor"), v.literal("administrator"));
const userStatus = v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted"));

async function writeAudit(ctx: MutationCtx & { user: ActiveUser }, action: string, resourceId: string, beforeSnapshot: unknown, afterSnapshot: unknown) {
  await ctx.db.insert("auditLog", {
    actorUserId: ctx.user._id,
    action,
    resourceType: "user",
    resourceId,
    beforeSnapshot,
    afterSnapshot,
    createdAt: Date.now(),
  });
}

export const listUsers = administratorQuery({
  args: {},
  returns: v.array(v.object({
    id: v.id("users"),
    displayName: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    role,
    status: userStatus,
  })),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(200);
    return users.map((user) => ({
      id: user._id,
      displayName: user.displayName ?? user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? "user",
      status: user.status ?? "active",
    }));
  },
});

export const listListings = administratorQuery({
  args: {},
  returns: v.array(v.object({
    id: v.id("listings"),
    title: v.string(),
    kind: v.union(v.literal("class"), v.literal("event")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("cancelled"), v.literal("archived")),
    ownerUserId: v.id("users"),
    version: v.number(),
  })),
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").order("desc").take(200);
    return listings.map((listing) => ({
      id: listing._id,
      title: listing.title,
      kind: listing.kind,
      status: listing.status,
      ownerUserId: listing.ownerUserId,
      version: listing.version,
    }));
  },
});

export const setRole = administratorMutation({
  args: { userId: v.id("users"), role },
  returns: v.null(),
  handler: async (ctx, { userId, role: nextRole }) => {
    if (userId === ctx.user._id && nextRole !== "administrator") throw new ConvexError({ code: "SELF_LOCKOUT", message: "Vous ne pouvez pas retirer votre propre rôle administrateur." });
    const target = await ctx.db.get("users", userId);
    if (target === null) throw new ConvexError({ code: "NOT_FOUND", message: "Compte introuvable." });
    const previousRole = target.role ?? "user";
    await ctx.db.patch("users", userId, { role: nextRole, updatedAt: Date.now() });
    await writeAudit(ctx, "user.role_changed", userId, { role: previousRole }, { role: nextRole });
    return null;
  },
});

export const setStatus = administratorMutation({
  args: { userId: v.id("users"), status: userStatus },
  returns: v.null(),
  handler: async (ctx, { userId, status: nextStatus }) => {
    if (userId === ctx.user._id && nextStatus !== "active") throw new ConvexError({ code: "SELF_LOCKOUT", message: "Vous ne pouvez pas désactiver votre propre compte." });
    const target = await ctx.db.get("users", userId);
    if (target === null) throw new ConvexError({ code: "NOT_FOUND", message: "Compte introuvable." });
    const previousStatus = target.status ?? "active";
    await ctx.db.patch("users", userId, { status: nextStatus, updatedAt: Date.now() });
    await writeAudit(ctx, "user.status_changed", userId, { status: previousStatus }, { status: nextStatus });
    return null;
  },
});

export const transferOwnership = administratorMutation({
  args: { listingId: v.id("listings"), ownerUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { listingId, ownerUserId }) => {
    const [listing, owner] = await Promise.all([ctx.db.get("listings", listingId), ctx.db.get("users", ownerUserId)]);
    if (listing === null) throw new ConvexError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    if (owner === null || (owner.role !== "contributor" && owner.role !== "administrator") || owner.status !== "active") {
      throw new ConvexError({ code: "INVALID_OWNER", message: "Le nouveau responsable doit être un contributeur actif." });
    }
    await ctx.db.patch("listings", listingId, { ownerUserId, updatedAt: Date.now(), version: listing.version + 1 });
    await ctx.db.insert("auditLog", {
      actorUserId: ctx.user._id,
      action: "listing.ownership_transferred",
      resourceType: "listing",
      resourceId: listingId,
      beforeSnapshot: { ownerUserId: listing.ownerUserId },
      afterSnapshot: { ownerUserId },
      createdAt: Date.now(),
    });
    return null;
  },
});

export const grantAdministratorByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.id("users"),
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", normalized)).unique();
    if (user === null) throw new ConvexError({ code: "NOT_FOUND", message: "Créez d’abord ce compte via l’interface." });
    await ctx.db.patch("users", user._id, { role: "administrator", status: "active", updatedAt: Date.now() });
    await ctx.db.insert("auditLog", {
      actorUserId: user._id,
      action: "user.bootstrap_administrator",
      resourceType: "user",
      resourceId: user._id,
      beforeSnapshot: { role: user.role ?? "user", status: user.status ?? "active" },
      afterSnapshot: { role: "administrator", status: "active" },
      createdAt: Date.now(),
    });
    return user._id;
  },
});
