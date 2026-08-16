import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

export type AppRole = "user" | "contributor" | "administrator";
export type ActiveUser = Doc<"users"> & {
  role: AppRole;
  status: "active";
};

type AuthCtx = QueryCtx | MutationCtx;

export async function requireActiveUser(ctx: AuthCtx): Promise<ActiveUser> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign-in required." });
  }

  const user = await ctx.db.get("users", userId);
  if (user === null) {
    throw new ConvexError({ code: "USER_NOT_FOUND", message: "User profile not found." });
  }

  const status = user.status ?? "active";
  if (status !== "active") {
    throw new ConvexError({ code: "USER_INACTIVE", message: "This account is not active." });
  }

  return {
    ...user,
    role: user.role ?? "user",
    status,
  };
}

export function requireRole(user: ActiveUser, allowedRoles: AppRole[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission for this action." });
  }
}

export function requireListingOwnerOrAdministrator(
  user: ActiveUser,
  ownerUserId: Id<"users">,
): void {
  if (user.role !== "administrator" && user._id !== ownerUserId) {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not own this listing." });
  }
}

const withActiveUser = customCtx(async (ctx: AuthCtx) => ({
  user: await requireActiveUser(ctx),
}));

const withContributor = customCtx(async (ctx: AuthCtx) => {
  const user = await requireActiveUser(ctx);
  requireRole(user, ["contributor", "administrator"]);
  return { user };
});

const withAdministrator = customCtx(async (ctx: AuthCtx) => {
  const user = await requireActiveUser(ctx);
  requireRole(user, ["administrator"]);
  return { user };
});

export const authenticatedQuery = customQuery(query, withActiveUser);
export const authenticatedMutation = customMutation(mutation, withActiveUser);
export const contributorMutation = customMutation(mutation, withContributor);
export const administratorMutation = customMutation(mutation, withAdministrator);
