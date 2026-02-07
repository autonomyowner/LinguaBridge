import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query, QueryCtx, MutationCtx } from "./_generated/server";
import { betterAuth } from "better-auth";
import authConfig from "./auth.config";

// IMPORTANT: Use your frontend URL here, NOT the Convex site URL
const siteUrl = process.env.SITE_URL || "http://localhost:3000";
const isProduction = siteUrl.includes("travoices.xyz");

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      "https://www.travoices.xyz",
      "https://travoices.xyz",
      "http://localhost:3000",
      "http://localhost:5173", // Vite default port
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    // Cross-origin configuration - use token-based auth for Convex
    // Cookies don't work across different domains (travoices.xyz vs convex.site)
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
        path: "/",
      },
    },
    session: {
      // Use shorter cookie name to avoid issues
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    },
    // Google OAuth disabled for now - can be added later
    // socialProviders: {
    //   google: {
    //     clientId: process.env.GOOGLE_CLIENT_ID!,
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //   },
    // },
    plugins: [convex({ authConfig })],
  });
};

// Query to get current authenticated user from better-auth
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});

// Helper function to get authenticated user ID in Convex functions
export async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  try {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;
    return authUser._id;
  } catch {
    return null;
  }
}

// IMPORTANT: Wrap getAuthUser in try-catch - it THROWS when unauthenticated!
export async function getAuthenticatedAppUser(ctx: QueryCtx | MutationCtx) {
  try {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser || !authUser.email) return null;

    // Get your app's user record by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    return user;
  } catch {
    return null; // Not authenticated - return null, don't throw
  }
}

// Helper to get auth user directly (for creating app users on first sign-in)
export async function getBetterAuthUser(ctx: QueryCtx | MutationCtx) {
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
}
