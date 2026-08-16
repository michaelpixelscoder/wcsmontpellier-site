import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCourseCard } from "./lib/publicData";
import { courseCard, weekday } from "./lib/publicValidators";

const weekdayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const listPublished = query({
  args: {
    level: v.optional(v.string()),
    weekday: v.optional(weekday),
    search: v.optional(v.string()),
  },
  returns: v.array(courseCard),
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_kind_and_status", (q) => q.eq("kind", "class").eq("status", "published"))
      .take(100);
    const cards = (await Promise.all(listings.map((listing) => getCourseCard(ctx, listing)))).filter(
      (card) => card !== null,
    );
    const normalizedSearch = args.search?.trim().toLocaleLowerCase("fr") ?? "";

    return cards
      .filter((card) => args.level === undefined || card.level.slug === args.level)
      .filter(
        (card) =>
          args.weekday === undefined ||
          card.schedules.some((schedule) => schedule.weekday === args.weekday),
      )
      .filter((card) => {
        if (normalizedSearch === "") return true;
        const haystack = [
          card.title,
          card.summary,
          card.level.label,
          ...card.teachers,
          ...card.studios,
          ...card.schedules.flatMap((schedule) => [schedule.place.name, schedule.place.city]),
        ]
          .join(" ")
          .toLocaleLowerCase("fr");
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const scheduleA = a.schedules[0];
        const scheduleB = b.schedules[0];
        if (scheduleA === undefined || scheduleB === undefined) return a.title.localeCompare(b.title, "fr");
        const dayDifference = weekdayOrder.indexOf(scheduleA.weekday) - weekdayOrder.indexOf(scheduleB.weekday);
        return dayDifference || scheduleA.startTime.localeCompare(scheduleB.startTime);
      });
  },
});
