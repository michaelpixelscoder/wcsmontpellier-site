/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as administration from "../administration.js";
import type * as agenda from "../agenda.js";
import type * as auth from "../auth.js";
import type * as classes from "../classes.js";
import type * as contributions from "../contributions.js";
import type * as favorites from "../favorites.js";
import type * as homepage from "../homepage.js";
import type * as http from "../http.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_publicData from "../lib/publicData.js";
import type * as lib_publicValidators from "../lib/publicValidators.js";
import type * as media from "../media.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  administration: typeof administration;
  agenda: typeof agenda;
  auth: typeof auth;
  classes: typeof classes;
  contributions: typeof contributions;
  favorites: typeof favorites;
  homepage: typeof homepage;
  http: typeof http;
  "lib/authorization": typeof lib_authorization;
  "lib/publicData": typeof lib_publicData;
  "lib/publicValidators": typeof lib_publicValidators;
  media: typeof media;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
