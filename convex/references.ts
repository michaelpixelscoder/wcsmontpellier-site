import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { contributorMutation, contributorQuery, type ActiveUser } from "./lib/authorization";

const placeCard = v.object({
  id: v.id("places"),
  name: v.string(),
  addressLine1: v.string(),
  addressLine2: v.optional(v.string()),
  postalCode: v.string(),
  city: v.string(),
  countryCode: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  transportNotes: v.optional(v.string()),
  accessibilityNotes: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
});
const actorCard = v.object({
  id: v.id("actors"),
  name: v.string(),
  summary: v.string(),
  websiteUrl: v.optional(v.string()),
  contactUrl: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "reference";
}

function requireOwnerOrAdmin(userId: Id<"users">, role: "user" | "contributor" | "administrator", ownerUserId: Id<"users"> | undefined) {
  if (role !== "administrator" && ownerUserId !== userId) throw new ConvexError({ code: "FORBIDDEN", message: "Vous ne gérez pas cette référence." });
}

function validatePlaceInput(args: { name: string; addressLine1: string; postalCode: string; city: string; countryCode: string; latitude: number; longitude: number }) {
  if (args.name.trim().length < 2 || args.name.length > 120 || args.addressLine1.trim().length < 3 || args.city.trim().length < 2) throw new ConvexError({ code: "INVALID_INPUT", message: "Nom, adresse ou ville invalide." });
  if (!/^[A-Z]{2}$/.test(args.countryCode) || args.postalCode.length > 12) throw new ConvexError({ code: "INVALID_INPUT", message: "Code postal ou pays invalide." });
  if (!Number.isFinite(args.latitude) || args.latitude < -90 || args.latitude > 90 || !Number.isFinite(args.longitude) || args.longitude < -180 || args.longitude > 180) throw new ConvexError({ code: "INVALID_COORDINATES", message: "Coordonnées géographiques invalides." });
}

function validateActorInput(args: { name: string; summary: string; websiteUrl?: string; contactUrl?: string }) {
  if (args.name.trim().length < 2 || args.name.length > 120 || args.summary.trim().length < 10 || args.summary.length > 2_000) throw new ConvexError({ code: "INVALID_INPUT", message: "Nom ou présentation invalide." });
  for (const url of [args.websiteUrl, args.contactUrl]) {
    if (url !== undefined && !/^https?:\/\//.test(url)) throw new ConvexError({ code: "INVALID_URL", message: "Les liens doivent commencer par http:// ou https://." });
  }
}

async function audit(ctx: MutationCtx & { user: ActiveUser }, action: string, resourceType: string, resourceId: string, beforeSnapshot?: unknown, afterSnapshot?: unknown) {
  await ctx.db.insert("auditLog", { actorUserId: ctx.user._id, action, resourceType, resourceId, beforeSnapshot, afterSnapshot, createdAt: Date.now() });
}

export const listMine = contributorQuery({
  args: {},
  returns: v.object({ places: v.array(placeCard), actors: v.array(actorCard) }),
  handler: async (ctx) => {
    const [places, actors] = ctx.user.role === "administrator"
      ? await Promise.all([ctx.db.query("places").take(200), ctx.db.query("actors").take(200)])
      : await Promise.all([
          ctx.db.query("places").withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", ctx.user._id)).take(100),
          ctx.db.query("actors").withIndex("by_user_id", (q) => q.eq("userId", ctx.user._id)).take(100),
        ]);
    return {
      places: places.filter((place) => place.status !== "archived").map((place) => ({ id: place._id, name: place.name, addressLine1: place.addressLine1, addressLine2: place.addressLine2, postalCode: place.postalCode, city: place.city, countryCode: place.countryCode, latitude: place.latitude, longitude: place.longitude, transportNotes: place.transportNotes, accessibilityNotes: place.accessibilityNotes, status: place.status })),
      actors: actors.filter((actor) => actor.status !== "archived").map((actor) => ({ id: actor._id, name: actor.name, summary: actor.summary, websiteUrl: actor.websiteUrl, contactUrl: actor.contactUrl, status: actor.status })),
    };
  },
});

export const createPlace = contributorMutation({
  args: { name: v.string(), addressLine1: v.string(), addressLine2: v.optional(v.string()), postalCode: v.string(), city: v.string(), countryCode: v.string(), latitude: v.number(), longitude: v.number(), transportNotes: v.optional(v.string()), accessibilityNotes: v.optional(v.string()) },
  returns: v.id("places"),
  handler: async (ctx, args) => {
    validatePlaceInput(args);
    const now = Date.now();
    const id = await ctx.db.insert("places", { ...args, name: args.name.trim(), slug: `${slugify(args.name)}-${now.toString(36)}`, ownerUserId: ctx.user._id, status: "published", lastVerifiedAt: now, updatedAt: now });
    await audit(ctx, "place.created", "place", id, undefined, { name: args.name.trim() });
    return id;
  },
});

export const updatePlace = contributorMutation({
  args: { placeId: v.id("places"), name: v.string(), addressLine1: v.string(), addressLine2: v.optional(v.string()), postalCode: v.string(), city: v.string(), countryCode: v.string(), latitude: v.number(), longitude: v.number(), transportNotes: v.optional(v.string()), accessibilityNotes: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { placeId, ...patch }) => {
    validatePlaceInput(patch);
    const place = await ctx.db.get("places", placeId);
    if (place === null || place.status === "archived") throw new ConvexError({ code: "NOT_FOUND", message: "Lieu introuvable." });
    requireOwnerOrAdmin(ctx.user._id, ctx.user.role, place.ownerUserId);
    await ctx.db.patch("places", placeId, { ...patch, name: patch.name.trim(), lastVerifiedAt: Date.now(), updatedAt: Date.now() });
    await audit(ctx, "place.updated", "place", placeId, { name: place.name }, { name: patch.name.trim() });
    return null;
  },
});

export const archivePlace = contributorMutation({
  args: { placeId: v.id("places") },
  returns: v.null(),
  handler: async (ctx, { placeId }) => {
    const place = await ctx.db.get("places", placeId);
    if (place === null || place.status === "archived") throw new ConvexError({ code: "NOT_FOUND", message: "Lieu introuvable." });
    requireOwnerOrAdmin(ctx.user._id, ctx.user.role, place.ownerUserId);
    const links = await ctx.db.query("listingPlaces").withIndex("by_place_id", (q) => q.eq("placeId", placeId)).take(50);
    const linkedListings = await Promise.all(links.map((link) => ctx.db.get("listings", link.listingId)));
    if (linkedListings.some((listing) => listing !== null && listing.deletedAt === undefined)) throw new ConvexError({ code: "REFERENCE_IN_USE", message: "Ce lieu est encore utilisé par une fiche active." });
    await ctx.db.patch("places", placeId, { status: "archived", updatedAt: Date.now() });
    await audit(ctx, "place.archived", "place", placeId, { status: place.status }, { status: "archived" });
    return null;
  },
});

export const createActor = contributorMutation({
  args: { name: v.string(), summary: v.string(), websiteUrl: v.optional(v.string()), contactUrl: v.optional(v.string()) },
  returns: v.id("actors"),
  handler: async (ctx, args) => {
    validateActorInput(args);
    const now = Date.now();
    const id = await ctx.db.insert("actors", { ...args, name: args.name.trim(), slug: `${slugify(args.name)}-${now.toString(36)}`, userId: ctx.user._id, status: "published", lastVerifiedAt: now, updatedAt: now });
    await audit(ctx, "actor.created", "actor", id, undefined, { name: args.name.trim() });
    return id;
  },
});

export const updateActor = contributorMutation({
  args: { actorId: v.id("actors"), name: v.string(), summary: v.string(), websiteUrl: v.optional(v.string()), contactUrl: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { actorId, ...patch }) => {
    validateActorInput(patch);
    const actor = await ctx.db.get("actors", actorId);
    if (actor === null || actor.status === "archived") throw new ConvexError({ code: "NOT_FOUND", message: "Intervenant introuvable." });
    requireOwnerOrAdmin(ctx.user._id, ctx.user.role, actor.userId);
    await ctx.db.patch("actors", actorId, { ...patch, name: patch.name.trim(), lastVerifiedAt: Date.now(), updatedAt: Date.now() });
    await audit(ctx, "actor.updated", "actor", actorId, { name: actor.name }, { name: patch.name.trim() });
    return null;
  },
});

export const archiveActor = contributorMutation({
  args: { actorId: v.id("actors") },
  returns: v.null(),
  handler: async (ctx, { actorId }) => {
    const actor = await ctx.db.get("actors", actorId);
    if (actor === null || actor.status === "archived") throw new ConvexError({ code: "NOT_FOUND", message: "Intervenant introuvable." });
    requireOwnerOrAdmin(ctx.user._id, ctx.user.role, actor.userId);
    const [classLinks, eventLinks] = await Promise.all([
      ctx.db.query("classTeachers").withIndex("by_actor_id", (q) => q.eq("actorId", actorId)).take(50),
      ctx.db.query("eventOrganizers").withIndex("by_actor_id", (q) => q.eq("actorId", actorId)).take(50),
    ]);
    const listingIds = [...classLinks.map((link) => link.classListingId), ...eventLinks.map((link) => link.eventListingId)];
    const listings = await Promise.all(listingIds.map((listingId) => ctx.db.get("listings", listingId)));
    if (listings.some((listing) => listing !== null && listing.deletedAt === undefined)) throw new ConvexError({ code: "REFERENCE_IN_USE", message: "Cet intervenant est encore utilisé par une fiche active." });
    await ctx.db.patch("actors", actorId, { status: "archived", updatedAt: Date.now() });
    await audit(ctx, "actor.archived", "actor", actorId, { status: actor.status }, { status: "archived" });
    return null;
  },
});
