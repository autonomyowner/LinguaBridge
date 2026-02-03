/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics_mutations from "../analytics/mutations.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_utils from "../lib/utils.js";
import type * as rooms_actions from "../rooms/actions.js";
import type * as rooms_mutations from "../rooms/mutations.js";
import type * as rooms_queries from "../rooms/queries.js";
import type * as sessions_mutations from "../sessions/mutations.js";
import type * as sessions_queries from "../sessions/queries.js";
import type * as subscriptions_mutations from "../subscriptions/mutations.js";
import type * as subscriptions_queries from "../subscriptions/queries.js";
import type * as transcripts_mutations from "../transcripts/mutations.js";
import type * as transcripts_queries from "../transcripts/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "analytics/mutations": typeof analytics_mutations;
  auth: typeof auth;
  http: typeof http;
  "lib/permissions": typeof lib_permissions;
  "lib/utils": typeof lib_utils;
  "rooms/actions": typeof rooms_actions;
  "rooms/mutations": typeof rooms_mutations;
  "rooms/queries": typeof rooms_queries;
  "sessions/mutations": typeof sessions_mutations;
  "sessions/queries": typeof sessions_queries;
  "subscriptions/mutations": typeof subscriptions_mutations;
  "subscriptions/queries": typeof subscriptions_queries;
  "transcripts/mutations": typeof transcripts_mutations;
  "transcripts/queries": typeof transcripts_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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
