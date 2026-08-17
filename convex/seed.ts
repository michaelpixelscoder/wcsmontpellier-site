import type { WithoutSystemFields } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

const FIXTURE_NOW = Date.parse("2026-08-17T10:00:00+02:00");
const SOURCE_ROOT = "https://example.com/wcs-montpellier-demo";

type ActorInput = WithoutSystemFields<Doc<"actors">>;
type PlaceInput = WithoutSystemFields<Doc<"places">>;
type LevelInput = WithoutSystemFields<Doc<"levels">>;
type ListingInput = WithoutSystemFields<Doc<"listings">>;
type ScheduleRuleInput = WithoutSystemFields<Doc<"scheduleRules">>;
type OccurrenceInput = WithoutSystemFields<Doc<"occurrences">>;

async function upsertActor(ctx: MutationCtx, value: ActorInput): Promise<Id<"actors">> {
  const existing = await ctx.db
    .query("actors")
    .withIndex("by_slug", (q) => q.eq("slug", value.slug))
    .unique();
  if (existing !== null) {
    await ctx.db.patch("actors", existing._id, value);
    return existing._id;
  }
  return ctx.db.insert("actors", value);
}

async function upsertPlace(ctx: MutationCtx, value: PlaceInput): Promise<Id<"places">> {
  const existing = await ctx.db
    .query("places")
    .withIndex("by_slug", (q) => q.eq("slug", value.slug))
    .unique();
  if (existing !== null) {
    await ctx.db.patch("places", existing._id, value);
    return existing._id;
  }
  return ctx.db.insert("places", value);
}

async function upsertLevel(ctx: MutationCtx, value: LevelInput): Promise<Id<"levels">> {
  const existing = await ctx.db
    .query("levels")
    .withIndex("by_slug", (q) => q.eq("slug", value.slug))
    .unique();
  if (existing !== null) {
    await ctx.db.patch("levels", existing._id, value);
    return existing._id;
  }
  return ctx.db.insert("levels", value);
}

async function upsertListing(ctx: MutationCtx, value: ListingInput): Promise<Id<"listings">> {
  const existing = await ctx.db
    .query("listings")
    .withIndex("by_slug", (q) => q.eq("slug", value.slug))
    .unique();
  if (existing !== null) {
    await ctx.db.patch("listings", existing._id, value);
    return existing._id;
  }
  return ctx.db.insert("listings", value);
}

async function upsertScheduleRule(
  ctx: MutationCtx,
  value: ScheduleRuleInput,
): Promise<Id<"scheduleRules">> {
  const existing = await ctx.db
    .query("scheduleRules")
    .withIndex("by_listing_id", (q) => q.eq("listingId", value.listingId))
    .take(1);
  if (existing[0] !== undefined) {
    await ctx.db.patch("scheduleRules", existing[0]._id, value);
    return existing[0]._id;
  }
  return ctx.db.insert("scheduleRules", value);
}

async function upsertOccurrence(
  ctx: MutationCtx,
  value: OccurrenceInput,
): Promise<Id<"occurrences">> {
  const existing = await ctx.db
    .query("occurrences")
    .withIndex("by_occurrence_key", (q) => q.eq("occurrenceKey", value.occurrenceKey))
    .unique();
  if (existing !== null) {
    await ctx.db.patch("occurrences", existing._id, value);
    return existing._id;
  }
  return ctx.db.insert("occurrences", value);
}

async function upsertListingPlace(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  placeId: Id<"places">,
): Promise<void> {
  const existing = await ctx.db
    .query("listingPlaces")
    .withIndex("by_listing_id_and_place_id", (q) =>
      q.eq("listingId", listingId).eq("placeId", placeId),
    )
    .unique();
  const value = { listingId, placeId, isPrimary: true, sortOrder: 0 };
  if (existing !== null) await ctx.db.patch("listingPlaces", existing._id, value);
  else await ctx.db.insert("listingPlaces", value);
}

async function upsertClassTeacher(
  ctx: MutationCtx,
  classListingId: Id<"listings">,
  actorId: Id<"actors">,
): Promise<void> {
  const existing = await ctx.db
    .query("classTeachers")
    .withIndex("by_class_listing_id_and_actor_id", (q) =>
      q.eq("classListingId", classListingId).eq("actorId", actorId),
    )
    .unique();
  const value = { classListingId, actorId, sortOrder: 0 };
  if (existing !== null) await ctx.db.patch("classTeachers", existing._id, value);
  else await ctx.db.insert("classTeachers", value);
}

async function upsertClassStudio(
  ctx: MutationCtx,
  classListingId: Id<"listings">,
  studioActorId: Id<"actors">,
): Promise<void> {
  const existing = await ctx.db
    .query("classStudios")
    .withIndex("by_class_listing_id_and_studio_actor_id", (q) =>
      q.eq("classListingId", classListingId).eq("studioActorId", studioActorId),
    )
    .unique();
  const value = { classListingId, studioActorId, sortOrder: 0 };
  if (existing !== null) await ctx.db.patch("classStudios", existing._id, value);
  else await ctx.db.insert("classStudios", value);
}

async function upsertEventOrganizer(
  ctx: MutationCtx,
  eventListingId: Id<"listings">,
  actorId: Id<"actors">,
): Promise<void> {
  const existing = await ctx.db
    .query("eventOrganizers")
    .withIndex("by_event_listing_id_and_actor_id", (q) =>
      q.eq("eventListingId", eventListingId).eq("actorId", actorId),
    )
    .unique();
  const value = { eventListingId, actorId, sortOrder: 0 };
  if (existing !== null) await ctx.db.patch("eventOrganizers", existing._id, value);
  else await ctx.db.insert("eventOrganizers", value);
}

export const seedDemoData = internalMutation({
  args: {},
  returns: v.object({
    actors: v.number(),
    places: v.number(),
    classes: v.number(),
    events: v.number(),
    occurrences: v.number(),
  }),
  handler: async (ctx) => {
    const upsertFixtureUser = async (
      email: string,
      displayName: string,
      role: "user" | "contributor" | "administrator",
    ) => {
      const existing = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).unique();
      const value = { name: displayName, displayName, email, role, status: "active" as const, updatedAt: FIXTURE_NOW };
      if (existing !== null) {
        await ctx.db.patch("users", existing._id, value);
        return existing._id;
      }
      return ctx.db.insert("users", value);
    };
    await upsertFixtureUser("fixture-admin@wcsmontpellier.invalid", "Administrateur de démonstration", "administrator");
    const contributorUserIds = [
      await upsertFixtureUser("fixture-contributor-a@wcsmontpellier.invalid", "Contribution Démo A", "contributor"),
      await upsertFixtureUser("fixture-contributor-b@wcsmontpellier.invalid", "Contribution Démo B", "contributor"),
    ];
    const memberUserId = await upsertFixtureUser("fixture-user@wcsmontpellier.invalid", "Membre de démonstration", "user");
    const memberFavorites = await ctx.db.query("favorites").withIndex("by_user_id", (q) => q.eq("userId", memberUserId)).take(200);
    for (const favorite of memberFavorites) await ctx.db.delete("favorites", favorite._id);

    const levels = {
      initiation: await upsertLevel(ctx, {
        slug: "initiation",
        label: "Initiation",
        description: "Aucune expérience nécessaire.",
        sortOrder: 10,
        colorToken: "coral",
      }),
      fundamentals: await upsertLevel(ctx, {
        slug: "fondamentaux",
        label: "Fondamentaux",
        description: "Bases acquises ou premier trimestre de pratique.",
        sortOrder: 20,
        colorToken: "amber",
      }),
      intermediate: await upsertLevel(ctx, {
        slug: "intermediaire",
        label: "Intermédiaire",
        description: "Danse autonome et fondamentaux consolidés.",
        sortOrder: 30,
        colorToken: "teal",
      }),
    };

    const existingSeason = await ctx.db
      .query("seasons")
      .withIndex("by_starts_on", (q) => q.eq("startsOn", "2026-09-01"))
      .take(1);
    const seasonValue = {
      label: "Saison 2026–2027 (démo)",
      startsOn: "2026-09-01",
      endsOn: "2027-06-30",
      isCurrent: true,
    };
    const seasonId =
      existingSeason[0] === undefined
        ? await ctx.db.insert("seasons", seasonValue)
        : existingSeason[0]._id;
    if (existingSeason[0] !== undefined) {
      await ctx.db.patch("seasons", existingSeason[0]._id, seasonValue);
    }

    const placeBase = {
      countryCode: "FR",
      status: "published" as const,
      lastVerifiedAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    };
    const places = {
      antigone: await upsertPlace(ctx, {
        ...placeBase,
        slug: "studio-antigone-demo",
        name: "Studio Antigone (démo)",
        addressLine1: "10 place de la Démonstration",
        postalCode: "34000",
        city: "Montpellier",
        latitude: 43.6089,
        longitude: 3.8867,
        transportNotes: "Tram lignes 1 et 4, arrêt Place de l'Europe.",
      }),
      celleneuve: await upsertPlace(ctx, {
        ...placeBase,
        slug: "salle-celleneuve-demo",
        name: "Salle Celleneuve (démo)",
        addressLine1: "22 avenue de la Démonstration",
        postalCode: "34080",
        city: "Montpellier",
        latitude: 43.6148,
        longitude: 3.8258,
        transportNotes: "Tram ligne 3, arrêt Celleneuve.",
      }),
      portMarianne: await upsertPlace(ctx, {
        ...placeBase,
        slug: "loft-port-marianne-demo",
        name: "Loft Port Marianne (démo)",
        addressLine1: "5 rue du Bal Démo",
        postalCode: "34000",
        city: "Montpellier",
        latitude: 43.6007,
        longitude: 3.8986,
        parkingNotes: "Parking public à proximité.",
      }),
      castelnau: await upsertPlace(ctx, {
        ...placeBase,
        slug: "esplanade-castelnau-demo",
        name: "Esplanade de Castelnau (démo)",
        addressLine1: "1 place de la Danse Démo",
        postalCode: "34170",
        city: "Castelnau-le-Lez",
        latitude: 43.6337,
        longitude: 3.8998,
        transportNotes: "Tram ligne 2, arrêt Charles de Gaulle.",
      }),
    };

    const actorBase = {
      status: "published" as const,
      lastVerifiedAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    };
    const actors = {
      camille: await upsertActor(ctx, {
        ...actorBase,
        slug: "camille-demo",
        name: "Camille Démo",
        summary: "Enseignante fictive utilisée pour les données de démonstration.",
      }),
      julien: await upsertActor(ctx, {
        ...actorBase,
        slug: "julien-demo",
        name: "Julien Démo",
        summary: "Enseignant fictif utilisé pour les données de démonstration.",
      }),
      elise: await upsertActor(ctx, {
        ...actorBase,
        slug: "elise-demo",
        name: "Élise Démo",
        summary: "Enseignante fictive utilisée pour les données de démonstration.",
      }),
      studio: await upsertActor(ctx, {
        ...actorBase,
        slug: "atelier-pulse-demo",
        name: "Atelier Pulse (démo)",
        summary: "Studio fictif utilisé pour valider les parcours de cours.",
        websiteUrl: `${SOURCE_ROOT}/atelier-pulse`,
      }),
      collective: await upsertActor(ctx, {
        ...actorBase,
        slug: "collectif-social-demo",
        name: "Collectif Social WCS (démo)",
        summary: "Organisateur fictif utilisé pour valider l’agenda.",
        websiteUrl: `${SOURCE_ROOT}/collectif`,
      }),
    };

    const classFixtures = [
      {
        slug: "initiation-lundi-demo",
        title: "Initiation du lundi (démo)",
        summary: "Un cours découverte accessible sans partenaire.",
        levelId: levels.initiation,
        teacherId: actors.camille,
        placeId: places.antigone,
        weekdays: ["monday" as const],
        localStartTime: "19:30",
        localEndTime: "20:30",
        priceSummary: "Cours d’essai offert · données fictives",
      },
      {
        slug: "fondamentaux-mardi-demo",
        title: "Fondamentaux du mardi (démo)",
        summary: "Construire une danse confortable et musicale.",
        levelId: levels.fundamentals,
        teacherId: actors.julien,
        placeId: places.celleneuve,
        weekdays: ["tuesday" as const],
        localStartTime: "20:00",
        localEndTime: "21:15",
        priceSummary: "À partir de 12 € · données fictives",
      },
      {
        slug: "intermediaire-mercredi-demo",
        title: "Intermédiaire du mercredi (démo)",
        summary: "Technique, connexion et variations rythmiques.",
        levelId: levels.intermediate,
        teacherId: actors.elise,
        placeId: places.portMarianne,
        weekdays: ["wednesday" as const],
        localStartTime: "20:30",
        localEndTime: "21:45",
        priceSummary: "Forfait saison · données fictives",
      },
      {
        slug: "tous-niveaux-jeudi-demo",
        title: "Atelier tous niveaux du jeudi (démo)",
        summary: "Un atelier guidé avec options selon l’expérience.",
        levelId: levels.fundamentals,
        teacherId: actors.camille,
        placeId: places.castelnau,
        weekdays: ["thursday" as const],
        localStartTime: "19:00",
        localEndTime: "20:15",
        priceSummary: "15 € · données fictives",
      },
    ];

    for (const [fixtureIndex, fixture] of classFixtures.entries()) {
      const listingId = await upsertListing(ctx, {
        slug: fixture.slug,
        kind: "class",
        title: fixture.title,
        summary: fixture.summary,
        description: `${fixture.summary} Cette fiche est entièrement fictive et sert uniquement au développement.`,
        ownerUserId: contributorUserIds[fixtureIndex % contributorUserIds.length],
        sourceUrl: `${SOURCE_ROOT}/${fixture.slug}`,
        status: "published",
        verificationStatus: "contributor_verified",
        lastVerifiedAt: FIXTURE_NOW,
        publishedAt: FIXTURE_NOW,
        updatedAt: FIXTURE_NOW,
        version: 1,
      });
      const classRow = await ctx.db
        .query("classes")
        .withIndex("by_listing_id", (q) => q.eq("listingId", listingId))
        .unique();
      const classValue = {
        listingId,
        seasonId,
        levelId: fixture.levelId,
        trialAvailable: true,
        registrationStatus: "open" as const,
        priceSummary: fixture.priceSummary,
      };
      if (classRow !== null) await ctx.db.patch("classes", classRow._id, classValue);
      else await ctx.db.insert("classes", classValue);
      await upsertListingPlace(ctx, listingId, fixture.placeId);
      await upsertClassTeacher(ctx, listingId, fixture.teacherId);
      await upsertClassStudio(ctx, listingId, actors.studio);
      await upsertScheduleRule(ctx, {
        listingId,
        placeId: fixture.placeId,
        timezone: "Europe/Paris",
        frequency: "weekly",
        weekdays: fixture.weekdays,
        localStartTime: fixture.localStartTime,
        localEndTime: fixture.localEndTime,
        startsOn: "2026-09-01",
        endsOn: "2027-06-30",
        sourceText: `Chaque semaine, ${fixture.localStartTime}–${fixture.localEndTime} (donnée fictive)`,
      });
    }

    const eventFixtures = [
      {
        slug: "pratique-antigone-19-aout-demo",
        title: "Pratique libre à Antigone (démo)",
        summary: "Deux heures de pratique conviviale, accueil débutant prévu.",
        eventType: "practice" as const,
        beginnerFriendly: true,
        placeId: places.antigone,
        startsAt: Date.parse("2026-08-19T20:00:00+02:00"),
        endsAt: Date.parse("2026-08-19T22:00:00+02:00"),
        status: "scheduled" as const,
      },
      {
        slug: "social-port-marianne-21-aout-demo",
        title: "Social de Port Marianne (démo)",
        summary: "Soirée WCS avec initiation en début de soirée.",
        eventType: "social" as const,
        beginnerFriendly: true,
        placeId: places.portMarianne,
        startsAt: Date.parse("2026-08-21T21:00:00+02:00"),
        endsAt: Date.parse("2026-08-22T01:00:00+02:00"),
        status: "scheduled" as const,
      },
      {
        slug: "stage-musicalite-22-aout-demo",
        title: "Stage musicalité (démo)",
        summary: "Un après-midi fictif consacré aux accents et aux textures.",
        eventType: "workshop" as const,
        beginnerFriendly: false,
        placeId: places.celleneuve,
        startsAt: Date.parse("2026-08-22T14:00:00+02:00"),
        endsAt: Date.parse("2026-08-22T17:30:00+02:00"),
        status: "scheduled" as const,
      },
      {
        slug: "sunset-castelnau-26-aout-demo",
        title: "Sunset dance à Castelnau (démo)",
        summary: "Événement extérieur fictif, confirmation météo en attente.",
        eventType: "social" as const,
        beginnerFriendly: true,
        placeId: places.castelnau,
        startsAt: Date.parse("2026-08-26T19:30:00+02:00"),
        endsAt: Date.parse("2026-08-26T22:30:00+02:00"),
        status: "confirmation_pending" as const,
      },
      {
        slug: "rentree-28-aout-demo",
        title: "Soirée de rentrée annulée (démo)",
        summary: "Exemple fictif d’une occurrence annulée qui reste visible.",
        eventType: "open_day" as const,
        beginnerFriendly: true,
        placeId: places.antigone,
        startsAt: Date.parse("2026-08-28T20:30:00+02:00"),
        endsAt: Date.parse("2026-08-28T23:30:00+02:00"),
        status: "cancelled" as const,
      },
    ];

    for (const [fixtureIndex, fixture] of eventFixtures.entries()) {
      const listingId = await upsertListing(ctx, {
        slug: fixture.slug,
        kind: "event",
        title: fixture.title,
        summary: fixture.summary,
        description: `${fixture.summary} Cette fiche est entièrement fictive et sert uniquement au développement.`,
        ownerUserId: contributorUserIds[fixtureIndex % contributorUserIds.length],
        sourceUrl: `${SOURCE_ROOT}/${fixture.slug}`,
        status: "published",
        verificationStatus: "contributor_verified",
        lastVerifiedAt: FIXTURE_NOW,
        publishedAt: FIXTURE_NOW,
        updatedAt: FIXTURE_NOW,
        version: 1,
      });
      const eventRow = await ctx.db
        .query("events")
        .withIndex("by_listing_id", (q) => q.eq("listingId", listingId))
        .unique();
      const eventValue = {
        listingId,
        eventType: fixture.eventType,
        beginnerFriendly: fixture.beginnerFriendly,
        registrationRequired: fixture.eventType === "workshop",
      };
      if (eventRow !== null) await ctx.db.patch("events", eventRow._id, eventValue);
      else await ctx.db.insert("events", eventValue);
      await upsertListingPlace(ctx, listingId, fixture.placeId);
      await upsertEventOrganizer(ctx, listingId, actors.collective);
      await upsertOccurrence(ctx, {
        listingId,
        placeId: fixture.placeId,
        startsAt: fixture.startsAt,
        endsAt: fixture.endsAt,
        status: fixture.status,
        exceptionNote:
          fixture.status === "cancelled"
            ? "Annulation fictive destinée à tester cet état."
            : fixture.status === "confirmation_pending"
              ? "Confirmation fictive attendue 24 h avant."
              : undefined,
        sourceUrl: `${SOURCE_ROOT}/${fixture.slug}`,
        lastVerifiedAt: FIXTURE_NOW,
        occurrenceKey: `${fixture.slug}:${fixture.startsAt}`,
      });
    }

    return {
      actors: Object.keys(actors).length,
      places: Object.keys(places).length,
      classes: classFixtures.length,
      events: eventFixtures.length,
      occurrences: eventFixtures.length,
    };
  },
});

export const prepareExampleAccount = internalMutation({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "password").eq("providerAccountId", email))
      .unique();
    if (account !== null) return false;

    const legacyUsers = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).take(10);
    for (const legacyUser of legacyUsers) {
      await ctx.db.patch("users", legacyUser._id, {
        email: `legacy-${legacyUser._id}@wcsmontpellier.invalid`,
        status: "deleted",
        updatedAt: FIXTURE_NOW,
      });
    }
    return true;
  },
});
