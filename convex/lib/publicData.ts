import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type CourseCard = {
  id: Doc<"listings">["_id"];
  slug: string;
  title: string;
  summary: string;
  sourceUrl: string;
  verificationStatus: Doc<"listings">["verificationStatus"];
  lastVerifiedAt: number | null;
  trialAvailable: boolean;
  registrationStatus: Doc<"classes">["registrationStatus"];
  priceSummary: string | null;
  level: { slug: string; label: string; colorToken: string };
  teachers: string[];
  studios: string[];
  schedules: Array<{
    weekday: Doc<"scheduleRules">["weekdays"][number];
    startTime: string;
    endTime: string;
    place: {
      id: Doc<"places">["_id"];
      name: string;
      city: string;
      latitude: number;
      longitude: number;
    };
  }>;
};

export type EventCard = {
  occurrenceId: Doc<"occurrences">["_id"];
  listingId: Doc<"listings">["_id"];
  slug: string;
  title: string;
  summary: string;
  eventType: Doc<"events">["eventType"];
  beginnerFriendly: boolean;
  registrationRequired: boolean;
  startsAt: number;
  endsAt: number;
  status: Doc<"occurrences">["status"];
  exceptionNote: string | null;
  sourceUrl: string;
  lastVerifiedAt: number | null;
  organizers: string[];
  place: {
    id: Doc<"places">["_id"];
    name: string;
    city: string;
    latitude: number;
    longitude: number;
  };
};

export async function getCourseCard(
  ctx: QueryCtx,
  listing: Doc<"listings">,
): Promise<CourseCard | null> {
  const classRow = await ctx.db
    .query("classes")
    .withIndex("by_listing_id", (q) => q.eq("listingId", listing._id))
    .unique();
  if (classRow === null) return null;

  const level = await ctx.db.get("levels", classRow.levelId);
  if (level === null) return null;

  const teacherRelations = await ctx.db
    .query("classTeachers")
    .withIndex("by_class_listing_id", (q) => q.eq("classListingId", listing._id))
    .take(10);
  const teachers = (
    await Promise.all(teacherRelations.map((relation) => ctx.db.get("actors", relation.actorId)))
  )
    .filter((actor): actor is Doc<"actors"> => actor !== null && actor.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((actor) => actor.name);

  const studioRelations = await ctx.db
    .query("classStudios")
    .withIndex("by_class_listing_id", (q) => q.eq("classListingId", listing._id))
    .take(10);
  const studios = (
    await Promise.all(
      studioRelations.map((relation) => ctx.db.get("actors", relation.studioActorId)),
    )
  )
    .filter((actor): actor is Doc<"actors"> => actor !== null && actor.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((actor) => actor.name);

  const rules = await ctx.db
    .query("scheduleRules")
    .withIndex("by_listing_id", (q) => q.eq("listingId", listing._id))
    .take(12);
  const schedules = (
    await Promise.all(
      rules.flatMap((rule) =>
        rule.weekdays.map(async (weekday) => {
          const place = await ctx.db.get("places", rule.placeId);
          if (place === null || place.status !== "published") return null;
          return {
            weekday,
            startTime: rule.localStartTime,
            endTime: rule.localEndTime,
            place: {
              id: place._id,
              name: place.name,
              city: place.city,
              latitude: place.latitude,
              longitude: place.longitude,
            },
          };
        }),
      ),
    )
  ).filter((schedule) => schedule !== null);

  return {
    id: listing._id,
    slug: listing.slug,
    title: listing.title,
    summary: listing.summary,
    sourceUrl: listing.sourceUrl,
    verificationStatus: listing.verificationStatus,
    lastVerifiedAt: listing.lastVerifiedAt ?? null,
    trialAvailable: classRow.trialAvailable,
    registrationStatus: classRow.registrationStatus,
    priceSummary: classRow.priceSummary ?? null,
    level: {
      slug: level.slug,
      label: level.label,
      colorToken: level.colorToken,
    },
    teachers,
    studios,
    schedules,
  };
}

export async function getEventCard(
  ctx: QueryCtx,
  occurrence: Doc<"occurrences">,
): Promise<EventCard | null> {
  const listing = await ctx.db.get("listings", occurrence.listingId);
  if (listing === null || listing.kind !== "event" || listing.status !== "published") {
    return null;
  }
  const event = await ctx.db
    .query("events")
    .withIndex("by_listing_id", (q) => q.eq("listingId", listing._id))
    .unique();
  const place = await ctx.db.get("places", occurrence.placeId);
  if (event === null || place === null || place.status !== "published") return null;

  const organizerRelations = await ctx.db
    .query("eventOrganizers")
    .withIndex("by_event_listing_id", (q) => q.eq("eventListingId", listing._id))
    .take(10);
  const organizers = (
    await Promise.all(organizerRelations.map((relation) => ctx.db.get("actors", relation.actorId)))
  )
    .filter((actor): actor is Doc<"actors"> => actor !== null && actor.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((actor) => actor.name);

  return {
    occurrenceId: occurrence._id,
    listingId: listing._id,
    slug: listing.slug,
    title: listing.title,
    summary: listing.summary,
    eventType: event.eventType,
    beginnerFriendly: event.beginnerFriendly,
    registrationRequired: event.registrationRequired,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    status: occurrence.status,
    exceptionNote: occurrence.exceptionNote ?? null,
    sourceUrl: occurrence.sourceUrl,
    lastVerifiedAt: occurrence.lastVerifiedAt ?? listing.lastVerifiedAt ?? null,
    organizers,
    place: {
      id: place._id,
      name: place.name,
      city: place.city,
      latitude: place.latitude,
      longitude: place.longitude,
    },
  };
}
