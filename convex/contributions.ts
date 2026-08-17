import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import {
  type ActiveUser,
  contributorMutation,
  contributorQuery,
  requireListingOwnerOrAdministrator,
} from "./lib/authorization";

const kind = v.union(v.literal("class"), v.literal("event"));
const listingStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("cancelled"),
  v.literal("archived"),
);
const ownedListing = v.object({
  id: v.id("listings"),
  kind,
  title: v.string(),
  summary: v.string(),
  description: v.string(),
  sourceUrl: v.string(),
  status: listingStatus,
  version: v.number(),
  updatedAt: v.number(),
});

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "fiche";
}

async function audit(
  ctx: MutationCtx & { user: ActiveUser },
  action: string,
  listingId: string,
  beforeSnapshot?: unknown,
  afterSnapshot?: unknown,
) {
  await ctx.db.insert("auditLog", {
    actorUserId: ctx.user._id,
    action,
    resourceType: "listing",
    resourceId: listingId,
    beforeSnapshot,
    afterSnapshot,
    createdAt: Date.now(),
  });
}

export const listMine = contributorQuery({
  args: {},
  returns: v.array(ownedListing),
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", ctx.user._id))
      .order("desc")
      .take(100);
    return listings.filter((listing) => listing.deletedAt === undefined).map((listing) => ({
      id: listing._id,
      kind: listing.kind,
      title: listing.title,
      summary: listing.summary,
      description: listing.description,
      sourceUrl: listing.sourceUrl,
      status: listing.status,
      version: listing.version,
      updatedAt: listing.updatedAt,
    }));
  },
});

export const createDraft = contributorMutation({
  args: {
    kind,
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    sourceUrl: v.string(),
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (title.length < 3) throw new ConvexError({ code: "INVALID_INPUT", message: "Titre trop court." });
    const now = Date.now();
    const id = await ctx.db.insert("listings", {
      slug: `${slugify(title)}-${now.toString(36)}`,
      kind: args.kind,
      title,
      summary: args.summary.trim(),
      description: args.description.trim(),
      ownerUserId: ctx.user._id,
      sourceUrl: args.sourceUrl.trim(),
      status: "draft",
      verificationStatus: "unverified",
      updatedAt: now,
      version: 1,
    });
    await audit(ctx, "listing.created", id, undefined, { kind: args.kind, title, status: "draft" });
    return id;
  },
});

export const updateOwn = contributorMutation({
  args: {
    listingId: v.id("listings"),
    expectedVersion: v.number(),
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    sourceUrl: v.string(),
    status: listingStatus,
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || listing.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    requireListingOwnerOrAdministrator(ctx.user, listing.ownerUserId);
    if (listing.version !== args.expectedVersion) throw new ConvexError({ code: "VERSION_CONFLICT", message: "Cette fiche a été modifiée. Rechargez-la." });
    const nextVersion = listing.version + 1;
    const patch = {
      title: args.title.trim(),
      summary: args.summary.trim(),
      description: args.description.trim(),
      sourceUrl: args.sourceUrl.trim(),
      status: args.status,
      publishedAt: args.status === "published" ? (listing.publishedAt ?? Date.now()) : listing.publishedAt,
      updatedAt: Date.now(),
      version: nextVersion,
    };
    await ctx.db.patch("listings", listing._id, patch);
    await audit(ctx, "listing.updated", listing._id, { version: listing.version, status: listing.status }, { version: nextVersion, status: args.status });
    return nextVersion;
  },
});

export const archiveOwn = contributorMutation({
  args: { listingId: v.id("listings"), expectedVersion: v.number() },
  returns: v.null(),
  handler: async (ctx, { listingId, expectedVersion }) => {
    const listing = await ctx.db.get("listings", listingId);
    if (listing === null || listing.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    requireListingOwnerOrAdministrator(ctx.user, listing.ownerUserId);
    if (listing.version !== expectedVersion) throw new ConvexError({ code: "VERSION_CONFLICT", message: "Cette fiche a été modifiée. Rechargez-la." });
    await ctx.db.patch("listings", listing._id, { status: "archived", deletedAt: Date.now(), updatedAt: Date.now(), version: listing.version + 1 });
    await audit(ctx, "listing.archived", listing._id, { version: listing.version }, { version: listing.version + 1 });
    return null;
  },
});
