import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCourseCard, getEventCard } from "./lib/publicData";
import { courseCard, eventCard } from "./lib/publicValidators";

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

export const overview = query({
  args: { now: v.number() },
  returns: v.object({
    upcomingEvents: v.array(eventCard),
    featuredClasses: v.array(courseCard),
  }),
  handler: async (ctx, args) => {
    const until = args.now + THREE_WEEKS_MS;
    const [scheduled, pending, classListings] = await Promise.all([
      ctx.db
        .query("occurrences")
        .withIndex("by_status_and_starts_at", (q) =>
          q.eq("status", "scheduled").gte("startsAt", args.now).lt("startsAt", until),
        )
        .take(8),
      ctx.db
        .query("occurrences")
        .withIndex("by_status_and_starts_at", (q) =>
          q.eq("status", "confirmation_pending").gte("startsAt", args.now).lt("startsAt", until),
        )
        .take(8),
      ctx.db
        .query("listings")
        .withIndex("by_kind_and_status", (q) => q.eq("kind", "class").eq("status", "published"))
        .take(6),
    ]);

    const upcomingEvents = (
      await Promise.all(
        [...scheduled, ...pending]
          .sort((a, b) => a.startsAt - b.startsAt)
          .slice(0, 6)
          .map((occurrence) => getEventCard(ctx, occurrence)),
      )
    ).filter((event) => event !== null);
    const featuredClasses = (
      await Promise.all(classListings.map((listing) => getCourseCard(ctx, listing)))
    )
      .filter((course) => course !== null)
      .slice(0, 3);

    return { upcomingEvents, featuredClasses };
  },
});
