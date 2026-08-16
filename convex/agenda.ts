import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getEventCard } from "./lib/publicData";
import { eventCard, eventType } from "./lib/publicValidators";

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

async function occurrencesForStatus(
  ctx: QueryCtx,
  status: Doc<"occurrences">["status"],
  from: number,
  to: number,
) {
  return ctx.db
    .query("occurrences")
    .withIndex("by_status_and_starts_at", (q) =>
      q.eq("status", status).gte("startsAt", from).lt("startsAt", to),
    )
    .take(100);
}

export const listPublished = query({
  args: {
    from: v.number(),
    to: v.number(),
    eventType: v.optional(eventType),
    beginnerOnly: v.optional(v.boolean()),
  },
  returns: v.array(eventCard),
  handler: async (ctx, args) => {
    if (args.to <= args.from || args.to - args.from > MAX_RANGE_MS) {
      throw new ConvexError({ code: "INVALID_DATE_RANGE", message: "Choose a range up to one year." });
    }

    const rows = (
      await Promise.all([
        occurrencesForStatus(ctx, "scheduled", args.from, args.to),
        occurrencesForStatus(ctx, "confirmation_pending", args.from, args.to),
        occurrencesForStatus(ctx, "cancelled", args.from, args.to),
      ])
    ).flat();
    const cards = (await Promise.all(rows.map((row) => getEventCard(ctx, row)))).filter(
      (card) => card !== null,
    );

    return cards
      .filter((card) => args.eventType === undefined || card.eventType === args.eventType)
      .filter((card) => !args.beginnerOnly || card.beginnerFriendly)
      .sort((a, b) => a.startsAt - b.startsAt);
  },
});
