import { v } from "convex/values";
import { authenticatedMutation } from "./lib/authorization";

export const generateUploadUrl = authenticatedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const registerUpload = authenticatedMutation({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    byteSize: v.number(),
    altText: v.string(),
    credit: v.string(),
    sourceUrl: v.optional(v.string()),
    licenseOrPermission: v.string(),
  },
  returns: v.id("mediaAssets"),
  handler: async (ctx, args) => {
    return ctx.db.insert("mediaAssets", {
      ...args,
      uploadedByUserId: ctx.user._id,
      createdAt: Date.now(),
    });
  },
});
