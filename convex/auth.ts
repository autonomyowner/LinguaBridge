import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";
import { getMonthStart } from "./lib/utils";

// TRAVoices Authentication Configuration
// Email/Password authentication with Convex Auth

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    // Email + Password authentication
    Password({
      // Profile transformation - what gets stored in the users table
      profile(params) {
        const now = Date.now();
        return {
          email: params.email as string,
          name: (params.name as string) || "",
          // Initialize user with default values
          subscriptionTier: "free",
          minutesUsedThisMonth: 0,
          minutesResetAt: getMonthStart(),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
  callbacks: {
    // After user is created in the users table, set the tokenIdentifier
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      const id = existingUserId ?? userId;
      if (!id) return;

      // Get the user's identity
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return;

      // Update the user with the tokenIdentifier for future lookups
      await ctx.db.patch(id, {
        tokenIdentifier: identity.subject ?? identity.tokenIdentifier,
        updatedAt: Date.now(),
      });
    },
  },
});
