import { ConvexError, v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/authorization";

const favoriteListing = v.object({
  listingId: v.id("listings"),
  slug: v.string(),
  kind: v.union(v.literal("class"), v.literal("event")),
  title: v.string(),
  summary: v.string(),
  sourceUrl: v.string(),
});

export const listMine = authenticatedQuery({
  args: {},
  returns: v.array(favoriteListing),
  handler: async (ctx) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(200);
    const listings = await Promise.all(favorites.map((favorite) => ctx.db.get("listings", favorite.listingId)));
    return listings.flatMap((listing) =>
      listing !== null && listing.status === "published" && listing.deletedAt === undefined
        ? [{
            listingId: listing._id,
            slug: listing.slug,
            kind: listing.kind,
            title: listing.title,
            summary: listing.summary,
            sourceUrl: listing.sourceUrl,
          }]
        : [],
    );
  },
});

export const ids = authenticatedQuery({
  args: {},
  returns: v.array(v.id("listings")),
  handler: async (ctx) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user._id))
      .take(200);
    return favorites.map((favorite) => favorite.listingId);
  },
});

export const toggle = authenticatedMutation({
  args: { listingId: v.id("listings") },
  returns: v.boolean(),
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get("listings", listingId);
    if (listing === null || listing.status !== "published" || listing.deletedAt !== undefined) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Cette fiche publiée n’existe pas." });
    }
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_id_and_listing_id", (q) =>
        q.eq("userId", ctx.user._id).eq("listingId", listingId),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.delete("favorites", existing._id);
      return false;
    }
    await ctx.db.insert("favorites", { userId: ctx.user._id, listingId, createdAt: Date.now() });
    return true;
  },
});
