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
const classDetails = v.object({
  kind: v.literal("class"),
  seasonId: v.id("seasons"),
  levelId: v.id("levels"),
  trialAvailable: v.boolean(),
  registrationStatus: v.union(v.literal("unknown"), v.literal("open"), v.literal("waitlist"), v.literal("closed")),
  priceSummary: v.optional(v.string()),
});
const eventDetails = v.object({
  kind: v.literal("event"),
  eventType: v.union(v.literal("social"), v.literal("practice"), v.literal("workshop"), v.literal("festival"), v.literal("competition"), v.literal("open_day"), v.literal("other")),
  beginnerFriendly: v.boolean(),
  registrationRequired: v.boolean(),
});
const listingDetails = v.union(classDetails, eventDetails);
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
  details: listingDetails,
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
    const activeListings = listings.filter((listing) => listing.deletedAt === undefined);
    return (await Promise.all(activeListings.map(async (listing) => {
      if (listing.kind === "class") {
        const row = await ctx.db.query("classes").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique();
        if (row === null) return null;
        return { id: listing._id, kind: listing.kind, title: listing.title, summary: listing.summary, description: listing.description, sourceUrl: listing.sourceUrl, status: listing.status, version: listing.version, updatedAt: listing.updatedAt, details: { kind: "class" as const, seasonId: row.seasonId, levelId: row.levelId, trialAvailable: row.trialAvailable, registrationStatus: row.registrationStatus, priceSummary: row.priceSummary } };
      }
      const row = await ctx.db.query("events").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique();
      if (row === null) return null;
      return { id: listing._id, kind: listing.kind, title: listing.title, summary: listing.summary, description: listing.description, sourceUrl: listing.sourceUrl, status: listing.status, version: listing.version, updatedAt: listing.updatedAt, details: { kind: "event" as const, eventType: row.eventType, beginnerFriendly: row.beginnerFriendly, registrationRequired: row.registrationRequired } };
    }))).filter((listing): listing is NonNullable<typeof listing> => listing !== null);
  },
});

export const editorOptions = contributorQuery({
  args: {},
  returns: v.object({
    levels: v.array(v.object({ id: v.id("levels"), label: v.string() })),
    seasons: v.array(v.object({ id: v.id("seasons"), label: v.string(), isCurrent: v.boolean() })),
  }),
  handler: async (ctx) => {
    const [levels, seasons] = await Promise.all([
      ctx.db.query("levels").withIndex("by_sort_order").take(100),
      ctx.db.query("seasons").withIndex("by_starts_on").order("desc").take(20),
    ]);
    return {
      levels: levels.map((level) => ({ id: level._id, label: level.label })),
      seasons: seasons.map((season) => ({ id: season._id, label: season.label, isCurrent: season.isCurrent })),
    };
  },
});

export const createDraft = contributorMutation({
  args: {
    kind,
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    sourceUrl: v.string(),
    details: listingDetails,
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (title.length < 3) throw new ConvexError({ code: "INVALID_INPUT", message: "Titre trop court." });
    const now = Date.now();
    if (args.kind !== args.details.kind) throw new ConvexError({ code: "INVALID_INPUT", message: "Le type de fiche et ses détails ne correspondent pas." });
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
    if (args.details.kind === "class") {
      const [season, level] = await Promise.all([ctx.db.get("seasons", args.details.seasonId), ctx.db.get("levels", args.details.levelId)]);
      if (season === null || level === null) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Saison ou niveau introuvable." });
      await ctx.db.insert("classes", { listingId: id, seasonId: args.details.seasonId, levelId: args.details.levelId, trialAvailable: args.details.trialAvailable, registrationStatus: args.details.registrationStatus, priceSummary: args.details.priceSummary?.trim() || undefined });
    } else {
      await ctx.db.insert("events", { listingId: id, eventType: args.details.eventType, beginnerFriendly: args.details.beginnerFriendly, registrationRequired: args.details.registrationRequired });
    }
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
    details: listingDetails,
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || listing.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    requireListingOwnerOrAdministrator(ctx.user, listing.ownerUserId);
    if (listing.version !== args.expectedVersion) throw new ConvexError({ code: "VERSION_CONFLICT", message: "Cette fiche a été modifiée. Rechargez-la." });
    if (listing.kind !== args.details.kind) throw new ConvexError({ code: "INVALID_INPUT", message: "Le type de fiche ne peut pas être modifié." });
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
    if (args.details.kind === "class") {
      const [row, season, level] = await Promise.all([
        ctx.db.query("classes").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique(),
        ctx.db.get("seasons", args.details.seasonId),
        ctx.db.get("levels", args.details.levelId),
      ]);
      if (row === null || season === null || level === null) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Détails de cours incomplets." });
      await ctx.db.patch("classes", row._id, { seasonId: args.details.seasonId, levelId: args.details.levelId, trialAvailable: args.details.trialAvailable, registrationStatus: args.details.registrationStatus, priceSummary: args.details.priceSummary?.trim() || undefined });
    } else {
      const row = await ctx.db.query("events").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique();
      if (row === null) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Détails d’événement incomplets." });
      await ctx.db.patch("events", row._id, { eventType: args.details.eventType, beginnerFriendly: args.details.beginnerFriendly, registrationRequired: args.details.registrationRequired });
    }
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
