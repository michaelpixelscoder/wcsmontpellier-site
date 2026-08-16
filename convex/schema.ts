import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(
  v.literal("user"),
  v.literal("contributor"),
  v.literal("administrator"),
);

const userStatus = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("deleted"),
);

const publicationStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const listingStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("cancelled"),
  v.literal("archived"),
);

const verificationStatus = v.union(
  v.literal("unverified"),
  v.literal("contributor_verified"),
  v.literal("administrator_verified"),
  v.literal("stale"),
);

const weekday = v.union(
  v.literal("monday"),
  v.literal("tuesday"),
  v.literal("wednesday"),
  v.literal("thursday"),
  v.literal("friday"),
  v.literal("saturday"),
  v.literal("sunday"),
);

const { users: _authUsers, ...authTablesWithoutUsers } = authTables;

export default defineSchema({
  ...authTablesWithoutUsers,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    displayName: v.optional(v.string()),
    role: v.optional(role),
    status: v.optional(userStatus),
    lastLoginAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  favorites: defineTable({
    userId: v.id("users"),
    listingId: v.id("listings"),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_listing_id", ["listingId"])
    .index("by_user_id_and_listing_id", ["userId", "listingId"]),

  mediaAssets: defineTable({
    storageId: v.id("_storage"),
    mimeType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    byteSize: v.number(),
    altText: v.string(),
    credit: v.string(),
    sourceUrl: v.optional(v.string()),
    licenseOrPermission: v.string(),
    focalX: v.optional(v.number()),
    focalY: v.optional(v.number()),
    uploadedByUserId: v.id("users"),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_uploaded_by_user_id", ["uploadedByUserId"]),

  actors: defineTable({
    slug: v.string(),
    name: v.string(),
    userId: v.optional(v.id("users")),
    summary: v.string(),
    websiteUrl: v.optional(v.string()),
    contactUrl: v.optional(v.string()),
    badgeMediaId: v.optional(v.id("mediaAssets")),
    heroMediaId: v.optional(v.id("mediaAssets")),
    status: publicationStatus,
    lastVerifiedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["status"],
    }),

  places: defineTable({
    slug: v.string(),
    name: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    postalCode: v.string(),
    city: v.string(),
    countryCode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    transportNotes: v.optional(v.string()),
    parkingNotes: v.optional(v.string()),
    accessibilityNotes: v.optional(v.string()),
    arrivalNotes: v.optional(v.string()),
    badgeMediaId: v.optional(v.id("mediaAssets")),
    heroMediaId: v.optional(v.id("mediaAssets")),
    status: publicationStatus,
    lastVerifiedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_city_and_status", ["city", "status"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["status", "city"],
    }),

  levels: defineTable({
    slug: v.string(),
    label: v.string(),
    description: v.string(),
    sortOrder: v.number(),
    colorToken: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_sort_order", ["sortOrder"]),

  seasons: defineTable({
    label: v.string(),
    startsOn: v.string(),
    endsOn: v.string(),
    isCurrent: v.boolean(),
  })
    .index("by_is_current", ["isCurrent"])
    .index("by_starts_on", ["startsOn"]),

  listings: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("class"), v.literal("event")),
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    ownerUserId: v.id("users"),
    sourceUrl: v.string(),
    registrationUrl: v.optional(v.string()),
    badgeMediaId: v.optional(v.id("mediaAssets")),
    heroMediaId: v.optional(v.id("mediaAssets")),
    status: listingStatus,
    verificationStatus,
    lastVerifiedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    version: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_kind_and_status", ["kind", "status"])
    .index("by_owner_user_id", ["ownerUserId"])
    .index("by_owner_user_id_and_status", ["ownerUserId", "status"])
    .index("by_status_and_verification_status", [
      "status",
      "verificationStatus",
    ])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["kind", "status", "verificationStatus"],
    }),

  classes: defineTable({
    listingId: v.id("listings"),
    seasonId: v.id("seasons"),
    levelId: v.id("levels"),
    trialAvailable: v.boolean(),
    registrationStatus: v.union(
      v.literal("unknown"),
      v.literal("open"),
      v.literal("waitlist"),
      v.literal("closed"),
    ),
    priceSummary: v.optional(v.string()),
  })
    .index("by_listing_id", ["listingId"])
    .index("by_season_id", ["seasonId"])
    .index("by_level_id", ["levelId"])
    .index("by_season_id_and_level_id", ["seasonId", "levelId"]),

  events: defineTable({
    listingId: v.id("listings"),
    eventType: v.union(
      v.literal("social"),
      v.literal("practice"),
      v.literal("workshop"),
      v.literal("festival"),
      v.literal("competition"),
      v.literal("open_day"),
      v.literal("other"),
    ),
    beginnerFriendly: v.boolean(),
    registrationRequired: v.boolean(),
  })
    .index("by_listing_id", ["listingId"])
    .index("by_event_type", ["eventType"]),

  classTeachers: defineTable({
    classListingId: v.id("listings"),
    actorId: v.id("actors"),
    sortOrder: v.number(),
  })
    .index("by_class_listing_id", ["classListingId"])
    .index("by_actor_id", ["actorId"])
    .index("by_class_listing_id_and_actor_id", ["classListingId", "actorId"]),

  classStudios: defineTable({
    classListingId: v.id("listings"),
    studioActorId: v.id("actors"),
    sortOrder: v.number(),
  })
    .index("by_class_listing_id", ["classListingId"])
    .index("by_studio_actor_id", ["studioActorId"])
    .index("by_class_listing_id_and_studio_actor_id", [
      "classListingId",
      "studioActorId",
    ]),

  studioOwners: defineTable({
    studioActorId: v.id("actors"),
    ownerActorId: v.id("actors"),
    sortOrder: v.number(),
  })
    .index("by_studio_actor_id", ["studioActorId"])
    .index("by_owner_actor_id", ["ownerActorId"])
    .index("by_studio_actor_id_and_owner_actor_id", [
      "studioActorId",
      "ownerActorId",
    ]),

  eventOrganizers: defineTable({
    eventListingId: v.id("listings"),
    actorId: v.id("actors"),
    sortOrder: v.number(),
  })
    .index("by_event_listing_id", ["eventListingId"])
    .index("by_actor_id", ["actorId"])
    .index("by_event_listing_id_and_actor_id", ["eventListingId", "actorId"]),

  listingPlaces: defineTable({
    listingId: v.id("listings"),
    placeId: v.id("places"),
    isPrimary: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_listing_id", ["listingId"])
    .index("by_place_id", ["placeId"])
    .index("by_listing_id_and_place_id", ["listingId", "placeId"]),

  scheduleRules: defineTable({
    listingId: v.id("listings"),
    placeId: v.id("places"),
    timezone: v.string(),
    frequency: v.union(
      v.literal("once"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    weekdays: v.array(weekday),
    localStartTime: v.string(),
    localEndTime: v.string(),
    startsOn: v.string(),
    endsOn: v.string(),
    sourceText: v.string(),
  })
    .index("by_listing_id", ["listingId"])
    .index("by_place_id", ["placeId"])
    .index("by_listing_id_and_starts_on", ["listingId", "startsOn"]),

  occurrences: defineTable({
    listingId: v.id("listings"),
    scheduleRuleId: v.optional(v.id("scheduleRules")),
    placeId: v.id("places"),
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmation_pending"),
      v.literal("cancelled"),
      v.literal("completed"),
    ),
    exceptionNote: v.optional(v.string()),
    sourceUrl: v.string(),
    lastVerifiedAt: v.optional(v.number()),
    occurrenceKey: v.string(),
  })
    .index("by_occurrence_key", ["occurrenceKey"])
    .index("by_listing_id_and_starts_at", ["listingId", "startsAt"])
    .index("by_schedule_rule_id", ["scheduleRuleId"])
    .index("by_place_id_and_starts_at", ["placeId", "startsAt"])
    .index("by_status_and_starts_at", ["status", "startsAt"]),

  contentPages: defineTable({
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    bodyMarkdown: v.string(),
    badgeMediaId: v.optional(v.id("mediaAssets")),
    heroMediaId: v.optional(v.id("mediaAssets")),
    seoTitle: v.string(),
    seoDescription: v.string(),
    status: publicationStatus,
    publishedAt: v.optional(v.number()),
    updatedByUserId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  referenceRequests: defineTable({
    requesterUserId: v.id("users"),
    kind: v.union(
      v.literal("new_actor"),
      v.literal("actor_correction"),
      v.literal("new_place"),
      v.literal("place_correction"),
      v.literal("listing_dispute"),
    ),
    payload: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("withdrawn"),
    ),
    reviewedByUserId: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_requester_user_id", ["requesterUserId"])
    .index("by_status", ["status"]),

  auditLog: defineTable({
    actorUserId: v.id("users"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    beforeSnapshot: v.optional(v.any()),
    afterSnapshot: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_actor_user_id_and_created_at", ["actorUserId", "createdAt"])
    .index("by_resource_type_and_resource_id", [
      "resourceType",
      "resourceId",
    ]),
});
