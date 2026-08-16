import { v } from "convex/values";

export const weekday = v.union(
  v.literal("monday"),
  v.literal("tuesday"),
  v.literal("wednesday"),
  v.literal("thursday"),
  v.literal("friday"),
  v.literal("saturday"),
  v.literal("sunday"),
);

export const eventType = v.union(
  v.literal("social"),
  v.literal("practice"),
  v.literal("workshop"),
  v.literal("festival"),
  v.literal("competition"),
  v.literal("open_day"),
  v.literal("other"),
);

export const courseCard = v.object({
  id: v.id("listings"),
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  sourceUrl: v.string(),
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("contributor_verified"),
    v.literal("administrator_verified"),
    v.literal("stale"),
  ),
  lastVerifiedAt: v.union(v.number(), v.null()),
  trialAvailable: v.boolean(),
  registrationStatus: v.union(
    v.literal("unknown"),
    v.literal("open"),
    v.literal("waitlist"),
    v.literal("closed"),
  ),
  priceSummary: v.union(v.string(), v.null()),
  level: v.object({
    slug: v.string(),
    label: v.string(),
    colorToken: v.string(),
  }),
  teachers: v.array(v.string()),
  studios: v.array(v.string()),
  schedules: v.array(
    v.object({
      weekday,
      startTime: v.string(),
      endTime: v.string(),
      place: v.object({
        id: v.id("places"),
        name: v.string(),
        city: v.string(),
        latitude: v.number(),
        longitude: v.number(),
      }),
    }),
  ),
});

export const eventCard = v.object({
  occurrenceId: v.id("occurrences"),
  listingId: v.id("listings"),
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  eventType,
  beginnerFriendly: v.boolean(),
  registrationRequired: v.boolean(),
  startsAt: v.number(),
  endsAt: v.number(),
  status: v.union(
    v.literal("scheduled"),
    v.literal("confirmation_pending"),
    v.literal("cancelled"),
    v.literal("completed"),
  ),
  exceptionNote: v.union(v.string(), v.null()),
  sourceUrl: v.string(),
  lastVerifiedAt: v.union(v.number(), v.null()),
  organizers: v.array(v.string()),
  place: v.object({
    id: v.id("places"),
    name: v.string(),
    city: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  }),
});
