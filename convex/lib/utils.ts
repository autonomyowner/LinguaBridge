import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { TIER_LIMITS, SubscriptionTier } from "../schema";

// ============================================
// USER HELPERS
// ============================================

/**
 * Get the current authenticated user
 * Throws if not authenticated
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Convex Auth stores user ID directly in subject (format: users|<id>)
  // Try to extract and use the ID directly
  if (identity.subject && identity.subject.includes("|")) {
    const [table, id] = identity.subject.split("|");
    if (table === "users" && id) {
      try {
        const user = await ctx.db.get(id as Id<"users">);
        if (user) return user;
      } catch {
        // ID format might be wrong, continue with other methods
      }
    }
  }

  // Try to find user by tokenIdentifier first
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  // If not found, try to find by subject (Convex Auth uses this)
  if (!user && identity.subject) {
    user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
  }

  // If not found, try to find by email (for new auth users)
  if (!user && identity.email) {
    user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .unique();
  }

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Get the current user or null if not authenticated
 */
export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Convex Auth stores user ID directly in subject (format: users|<id>)
  // Try to extract and use the ID directly
  if (identity.subject && identity.subject.includes("|")) {
    const [table, id] = identity.subject.split("|");
    if (table === "users" && id) {
      try {
        const user = await ctx.db.get(id as Id<"users">);
        if (user) return user;
      } catch {
        // ID format might be wrong, continue with other methods
      }
    }
  }

  // Try to find user by tokenIdentifier
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  // If not found, try to find by subject
  if (!user && identity.subject) {
    user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
  }

  // If not found, try to find by email (for new auth users)
  if (!user && identity.email) {
    user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .unique();
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"users"> | null> {
  return await ctx.db.get(userId);
}

// ============================================
// SUBSCRIPTION HELPERS
// ============================================

/**
 * Get the tier limits for a user
 */
export function getTierLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier];
}

/**
 * Get user's subscription tier with default
 */
export function getUserTier(user: Doc<"users">): SubscriptionTier {
  return user.subscriptionTier ?? "free";
}

/**
 * Check if user has exceeded their monthly minutes
 */
export function hasExceededMinutes(user: Doc<"users">): boolean {
  const limits = getTierLimits(getUserTier(user));
  const minutesUsed = user.minutesUsedThisMonth ?? 0;
  return minutesUsed >= limits.minutesPerMonth;
}

/**
 * Check if user can create more rooms
 */
export async function canCreateRoom(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">
): Promise<boolean> {
  const limits = getTierLimits(getUserTier(user));
  if (limits.maxRooms === Infinity) return true;

  const roomCount = await ctx.db
    .query("rooms")
    .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  return roomCount.length < limits.maxRooms;
}

/**
 * Check if room can accept more participants
 */
export async function canJoinRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  user: Doc<"users">
): Promise<{ allowed: boolean; reason?: string }> {
  const room = await ctx.db.get(roomId);
  if (!room) {
    return { allowed: false, reason: "Room not found" };
  }

  if (!room.isActive) {
    return { allowed: false, reason: "Room is no longer active" };
  }

  // Check if user is already a participant
  const existingParticipant = await ctx.db
    .query("participants")
    .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", user._id))
    .unique();

  if (existingParticipant) {
    return { allowed: true }; // Already in room
  }

  // Check participant limit
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  if (participants.length >= room.maxParticipants) {
    return { allowed: false, reason: "Room is full" };
  }

  return { allowed: true };
}

// ============================================
// DATE HELPERS
// ============================================

/**
 * Get the start of the current month as timestamp
 */
export function getMonthStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Check if timestamp is in current month
 */
export function isCurrentMonth(timestamp: number): boolean {
  const monthStart = getMonthStart();
  return timestamp >= monthStart;
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a random room code
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique LiveKit room name
 */
export function generateLivekitRoomName(roomName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = roomName.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 20);
  return `${sanitized}-${timestamp}-${random}`;
}

/**
 * Generate API key
 */
export function generateApiKey(): { key: string; prefix: string } {
  const prefix = "tvk_"; // TRAVoices Key
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return { key, prefix: key.substring(0, 12) };
}

// ============================================
// CRYPTO HELPERS
// ============================================

/**
 * Simple hash function for API keys
 * In production, use a proper crypto library
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
