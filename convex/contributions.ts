import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  type ActiveUser,
  contributorMutation,
  contributorQuery,
  requireListingOwnerOrAdministrator,
} from "./lib/authorization";

const kind = v.union(v.literal("class"), v.literal("event"));
const listingStatus = v.union(v.literal("draft"), v.literal("published"), v.literal("cancelled"), v.literal("archived"));
const weekday = v.union(v.literal("monday"), v.literal("tuesday"), v.literal("wednesday"), v.literal("thursday"), v.literal("friday"), v.literal("saturday"), v.literal("sunday"));
const occurrenceStatus = v.union(v.literal("scheduled"), v.literal("confirmation_pending"), v.literal("cancelled"), v.literal("completed"));
const classSchedule = v.object({
  placeId: v.id("places"),
  weekdays: v.array(weekday),
  localStartTime: v.string(),
  localEndTime: v.string(),
  startsOn: v.string(),
  endsOn: v.string(),
});
const eventOccurrence = v.object({
  placeId: v.id("places"),
  startsAt: v.number(),
  endsAt: v.number(),
  status: occurrenceStatus,
});
const classDetailsInput = v.object({
  kind: v.literal("class"),
  seasonId: v.id("seasons"),
  levelId: v.id("levels"),
  trialAvailable: v.boolean(),
  registrationStatus: v.union(v.literal("unknown"), v.literal("open"), v.literal("waitlist"), v.literal("closed")),
  priceSummary: v.optional(v.string()),
  teacherIds: v.array(v.id("actors")),
  schedule: v.optional(classSchedule),
});
const eventDetailsInput = v.object({
  kind: v.literal("event"),
  eventType: v.union(v.literal("social"), v.literal("practice"), v.literal("workshop"), v.literal("festival"), v.literal("competition"), v.literal("open_day"), v.literal("other")),
  beginnerFriendly: v.boolean(),
  registrationRequired: v.boolean(),
  organizerIds: v.array(v.id("actors")),
  occurrence: v.optional(eventOccurrence),
});
const listingDetailsInput = v.union(classDetailsInput, eventDetailsInput);
const returnedClassDetails = v.object({
  kind: v.literal("class"),
  seasonId: v.id("seasons"),
  levelId: v.id("levels"),
  trialAvailable: v.boolean(),
  registrationStatus: v.union(v.literal("unknown"), v.literal("open"), v.literal("waitlist"), v.literal("closed")),
  priceSummary: v.optional(v.string()),
  teacherIds: v.array(v.id("actors")),
  schedule: v.union(classSchedule, v.null()),
});
const returnedEventDetails = v.object({
  kind: v.literal("event"),
  eventType: v.union(v.literal("social"), v.literal("practice"), v.literal("workshop"), v.literal("festival"), v.literal("competition"), v.literal("open_day"), v.literal("other")),
  beginnerFriendly: v.boolean(),
  registrationRequired: v.boolean(),
  organizerIds: v.array(v.id("actors")),
  occurrence: v.union(eventOccurrence, v.null()),
});
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
  details: v.union(returnedClassDetails, returnedEventDetails),
});

type WriteCtx = MutationCtx & { user: ActiveUser };

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "fiche";
}

async function audit(ctx: WriteCtx, action: string, listingId: string, beforeSnapshot?: unknown, afterSnapshot?: unknown) {
  await ctx.db.insert("auditLog", { actorUserId: ctx.user._id, action, resourceType: "listing", resourceId: listingId, beforeSnapshot, afterSnapshot, createdAt: Date.now() });
}

async function requirePublishedPlace(ctx: MutationCtx, placeId: Id<"places">) {
  const place = await ctx.db.get("places", placeId);
  if (place === null || place.status !== "published") throw new ConvexError({ code: "INVALID_REFERENCE", message: "Lieu publié introuvable." });
}

async function requirePublishedActors(ctx: MutationCtx, actorIds: Id<"actors">[]) {
  if (actorIds.length > 10 || new Set(actorIds).size !== actorIds.length) throw new ConvexError({ code: "INVALID_INPUT", message: "Sélection d’acteurs invalide." });
  const actors = await Promise.all(actorIds.map((actorId) => ctx.db.get("actors", actorId)));
  if (actors.some((actor) => actor === null || actor.status !== "published")) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Enseignant ou organisateur publié introuvable." });
}

async function savePrimaryPlace(ctx: MutationCtx, listingId: Id<"listings">, placeId: Id<"places">) {
  const links = await ctx.db.query("listingPlaces").withIndex("by_listing_id", (q) => q.eq("listingId", listingId)).take(50);
  const selected = links.find((link) => link.placeId === placeId);
  await Promise.all(links.filter((link) => link.isPrimary && link._id !== selected?._id).map((link) => ctx.db.patch("listingPlaces", link._id, { isPrimary: false })));
  if (selected === undefined) await ctx.db.insert("listingPlaces", { listingId, placeId, isPrimary: true, sortOrder: 0 });
  else await ctx.db.patch("listingPlaces", selected._id, { isPrimary: true, sortOrder: 0 });
}

async function syncClassTeachers(ctx: MutationCtx, listingId: Id<"listings">, actorIds: Id<"actors">[]) {
  const current = await ctx.db.query("classTeachers").withIndex("by_class_listing_id", (q) => q.eq("classListingId", listingId)).take(50);
  await Promise.all(current.filter((link) => !actorIds.includes(link.actorId)).map((link) => ctx.db.delete("classTeachers", link._id)));
  for (const [sortOrder, actorId] of actorIds.entries()) {
    const existing = current.find((link) => link.actorId === actorId);
    if (existing === undefined) await ctx.db.insert("classTeachers", { classListingId: listingId, actorId, sortOrder });
    else if (existing.sortOrder !== sortOrder) await ctx.db.patch("classTeachers", existing._id, { sortOrder });
  }
}

async function syncEventOrganizers(ctx: MutationCtx, listingId: Id<"listings">, actorIds: Id<"actors">[]) {
  const current = await ctx.db.query("eventOrganizers").withIndex("by_event_listing_id", (q) => q.eq("eventListingId", listingId)).take(50);
  await Promise.all(current.filter((link) => !actorIds.includes(link.actorId)).map((link) => ctx.db.delete("eventOrganizers", link._id)));
  for (const [sortOrder, actorId] of actorIds.entries()) {
    const existing = current.find((link) => link.actorId === actorId);
    if (existing === undefined) await ctx.db.insert("eventOrganizers", { eventListingId: listingId, actorId, sortOrder });
    else if (existing.sortOrder !== sortOrder) await ctx.db.patch("eventOrganizers", existing._id, { sortOrder });
  }
}

async function saveClassSchedule(ctx: MutationCtx, listingId: Id<"listings">, schedule: { placeId: Id<"places">; weekdays: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday">; localStartTime: string; localEndTime: string; startsOn: string; endsOn: string }) {
  if (schedule.weekdays.length === 0 || schedule.localEndTime <= schedule.localStartTime || schedule.endsOn < schedule.startsOn) throw new ConvexError({ code: "INVALID_SCHEDULE", message: "Le créneau hebdomadaire est invalide." });
  await requirePublishedPlace(ctx, schedule.placeId);
  await savePrimaryPlace(ctx, listingId, schedule.placeId);
  const existing = await ctx.db.query("scheduleRules").withIndex("by_listing_id", (q) => q.eq("listingId", listingId)).take(1);
  const value = { listingId, placeId: schedule.placeId, timezone: "Europe/Paris", frequency: "weekly" as const, weekdays: schedule.weekdays, localStartTime: schedule.localStartTime, localEndTime: schedule.localEndTime, startsOn: schedule.startsOn, endsOn: schedule.endsOn, sourceText: `${schedule.weekdays.join(", ")} ${schedule.localStartTime}–${schedule.localEndTime}` };
  if (existing[0] === undefined) await ctx.db.insert("scheduleRules", value);
  else await ctx.db.patch("scheduleRules", existing[0]._id, value);
}

async function saveEventOccurrence(ctx: MutationCtx, listingId: Id<"listings">, sourceUrl: string, occurrence: { placeId: Id<"places">; startsAt: number; endsAt: number; status: "scheduled" | "confirmation_pending" | "cancelled" | "completed" }) {
  if (occurrence.endsAt <= occurrence.startsAt) throw new ConvexError({ code: "INVALID_SCHEDULE", message: "La fin de l’événement doit suivre son début." });
  await requirePublishedPlace(ctx, occurrence.placeId);
  await savePrimaryPlace(ctx, listingId, occurrence.placeId);
  const existing = await ctx.db.query("occurrences").withIndex("by_listing_id_and_starts_at", (q) => q.eq("listingId", listingId)).take(1);
  const value = { listingId, placeId: occurrence.placeId, startsAt: occurrence.startsAt, endsAt: occurrence.endsAt, status: occurrence.status, sourceUrl, occurrenceKey: `${listingId}:${occurrence.startsAt}` };
  if (existing[0] === undefined) await ctx.db.insert("occurrences", value);
  else await ctx.db.patch("occurrences", existing[0]._id, value);
}

export const listMine = contributorQuery({
  args: {},
  returns: v.array(ownedListing),
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", ctx.user._id)).order("desc").take(100);
    return (await Promise.all(listings.filter((listing) => listing.deletedAt === undefined).map(async (listing) => {
      const base = { id: listing._id, kind: listing.kind, title: listing.title, summary: listing.summary, description: listing.description, sourceUrl: listing.sourceUrl, status: listing.status, version: listing.version, updatedAt: listing.updatedAt };
      if (listing.kind === "class") {
        const [row, schedules, teachers] = await Promise.all([
          ctx.db.query("classes").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique(),
          ctx.db.query("scheduleRules").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).take(1),
          ctx.db.query("classTeachers").withIndex("by_class_listing_id", (q) => q.eq("classListingId", listing._id)).take(20),
        ]);
        if (row === null) return null;
        const schedule = schedules[0];
        return {
          ...base,
          kind: "class" as const,
          details: {
            kind: "class" as const,
            seasonId: row.seasonId,
            levelId: row.levelId,
            trialAvailable: row.trialAvailable,
            registrationStatus: row.registrationStatus,
            priceSummary: row.priceSummary,
            teacherIds: teachers.sort((a, b) => a.sortOrder - b.sortOrder).map((teacher) => teacher.actorId),
            schedule: schedule === undefined ? null : { placeId: schedule.placeId, weekdays: schedule.weekdays, localStartTime: schedule.localStartTime, localEndTime: schedule.localEndTime, startsOn: schedule.startsOn, endsOn: schedule.endsOn },
          },
        };
      }
      const [row, occurrences, organizers] = await Promise.all([
        ctx.db.query("events").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique(),
        ctx.db.query("occurrences").withIndex("by_listing_id_and_starts_at", (q) => q.eq("listingId", listing._id)).take(1),
        ctx.db.query("eventOrganizers").withIndex("by_event_listing_id", (q) => q.eq("eventListingId", listing._id)).take(20),
      ]);
      if (row === null) return null;
      const occurrence = occurrences[0];
      return {
        ...base,
        kind: "event" as const,
        details: {
          kind: "event" as const,
          eventType: row.eventType,
          beginnerFriendly: row.beginnerFriendly,
          registrationRequired: row.registrationRequired,
          organizerIds: organizers.sort((a, b) => a.sortOrder - b.sortOrder).map((organizer) => organizer.actorId),
          occurrence: occurrence === undefined ? null : { placeId: occurrence.placeId, startsAt: occurrence.startsAt, endsAt: occurrence.endsAt, status: occurrence.status },
        },
      };
    }))).filter((listing): listing is NonNullable<typeof listing> => listing !== null);
  },
});

export const editorOptions = contributorQuery({
  args: {},
  returns: v.object({
    levels: v.array(v.object({ id: v.id("levels"), label: v.string() })),
    seasons: v.array(v.object({ id: v.id("seasons"), label: v.string(), isCurrent: v.boolean() })),
    places: v.array(v.object({ id: v.id("places"), name: v.string(), city: v.string() })),
    actors: v.array(v.object({ id: v.id("actors"), name: v.string() })),
  }),
  handler: async (ctx) => {
    const [levels, seasons, places, actors] = await Promise.all([
      ctx.db.query("levels").withIndex("by_sort_order").take(100),
      ctx.db.query("seasons").withIndex("by_starts_on").order("desc").take(20),
      ctx.db.query("places").withIndex("by_status", (q) => q.eq("status", "published")).take(100),
      ctx.db.query("actors").withIndex("by_status", (q) => q.eq("status", "published")).take(100),
    ]);
    return { levels: levels.map((level) => ({ id: level._id, label: level.label })), seasons: seasons.map((season) => ({ id: season._id, label: season.label, isCurrent: season.isCurrent })), places: places.map((place) => ({ id: place._id, name: place.name, city: place.city })), actors: actors.map((actor) => ({ id: actor._id, name: actor.name })) };
  },
});

export const createDraft = contributorMutation({
  args: { kind, title: v.string(), summary: v.string(), description: v.string(), sourceUrl: v.string(), details: listingDetailsInput },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (title.length < 3 || args.kind !== args.details.kind) throw new ConvexError({ code: "INVALID_INPUT", message: "Titre ou type de fiche invalide." });
    const now = Date.now();
    if (args.details.kind === "class") {
      const [season, level] = await Promise.all([ctx.db.get("seasons", args.details.seasonId), ctx.db.get("levels", args.details.levelId)]);
      if (season === null || level === null) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Saison ou niveau introuvable." });
      await requirePublishedActors(ctx, args.details.teacherIds);
      if (args.details.schedule !== undefined) await requirePublishedPlace(ctx, args.details.schedule.placeId);
    } else {
      await requirePublishedActors(ctx, args.details.organizerIds);
      if (args.details.occurrence !== undefined) await requirePublishedPlace(ctx, args.details.occurrence.placeId);
    }
    const id = await ctx.db.insert("listings", { slug: `${slugify(title)}-${now.toString(36)}`, kind: args.kind, title, summary: args.summary.trim(), description: args.description.trim(), ownerUserId: ctx.user._id, sourceUrl: args.sourceUrl.trim(), status: "draft", verificationStatus: "unverified", updatedAt: now, version: 1 });
    if (args.details.kind === "class") {
      await ctx.db.insert("classes", { listingId: id, seasonId: args.details.seasonId, levelId: args.details.levelId, trialAvailable: args.details.trialAvailable, registrationStatus: args.details.registrationStatus, priceSummary: args.details.priceSummary?.trim() || undefined });
      await syncClassTeachers(ctx, id, args.details.teacherIds);
      if (args.details.schedule !== undefined) await saveClassSchedule(ctx, id, args.details.schedule);
    } else {
      await ctx.db.insert("events", { listingId: id, eventType: args.details.eventType, beginnerFriendly: args.details.beginnerFriendly, registrationRequired: args.details.registrationRequired });
      await syncEventOrganizers(ctx, id, args.details.organizerIds);
      if (args.details.occurrence !== undefined) await saveEventOccurrence(ctx, id, args.sourceUrl.trim(), args.details.occurrence);
    }
    await audit(ctx, "listing.created", id, undefined, { kind: args.kind, title, status: "draft" });
    return id;
  },
});

export const updateOwn = contributorMutation({
  args: { listingId: v.id("listings"), expectedVersion: v.number(), title: v.string(), summary: v.string(), description: v.string(), sourceUrl: v.string(), status: listingStatus, details: listingDetailsInput },
  returns: v.number(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || listing.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    requireListingOwnerOrAdministrator(ctx.user, listing.ownerUserId);
    if (listing.version !== args.expectedVersion) throw new ConvexError({ code: "VERSION_CONFLICT", message: "Cette fiche a été modifiée. Rechargez-la." });
    if (listing.kind !== args.details.kind) throw new ConvexError({ code: "INVALID_INPUT", message: "Le type de fiche ne peut pas être modifié." });
    if (args.status === "published") {
      const complete = args.details.kind === "class" ? args.details.schedule !== undefined && args.details.teacherIds.length > 0 : args.details.occurrence !== undefined && args.details.organizerIds.length > 0;
      if (!complete) throw new ConvexError({ code: "INCOMPLETE_LISTING", message: "Ajoutez un lieu, un horaire et au moins un enseignant ou organisateur avant publication." });
    }
    const sourceUrl = args.sourceUrl.trim();
    if (args.details.kind === "class") {
      const [row, season, level] = await Promise.all([ctx.db.query("classes").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique(), ctx.db.get("seasons", args.details.seasonId), ctx.db.get("levels", args.details.levelId)]);
      if (row === null || season === null || level === null) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Détails de cours incomplets." });
      await requirePublishedActors(ctx, args.details.teacherIds);
      await ctx.db.patch("classes", row._id, { seasonId: args.details.seasonId, levelId: args.details.levelId, trialAvailable: args.details.trialAvailable, registrationStatus: args.details.registrationStatus, priceSummary: args.details.priceSummary?.trim() || undefined });
      await syncClassTeachers(ctx, listing._id, args.details.teacherIds);
      if (args.details.schedule !== undefined) await saveClassSchedule(ctx, listing._id, args.details.schedule);
    } else {
      const row = await ctx.db.query("events").withIndex("by_listing_id", (q) => q.eq("listingId", listing._id)).unique();
      if (row === null) throw new ConvexError({ code: "INVALID_REFERENCE", message: "Détails d’événement incomplets." });
      await requirePublishedActors(ctx, args.details.organizerIds);
      await ctx.db.patch("events", row._id, { eventType: args.details.eventType, beginnerFriendly: args.details.beginnerFriendly, registrationRequired: args.details.registrationRequired });
      await syncEventOrganizers(ctx, listing._id, args.details.organizerIds);
      if (args.details.occurrence !== undefined) await saveEventOccurrence(ctx, listing._id, sourceUrl, args.details.occurrence);
    }
    const nextVersion = listing.version + 1;
    await ctx.db.patch("listings", listing._id, { title: args.title.trim(), summary: args.summary.trim(), description: args.description.trim(), sourceUrl, status: args.status, publishedAt: args.status === "published" ? (listing.publishedAt ?? Date.now()) : listing.publishedAt, updatedAt: Date.now(), version: nextVersion });
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
