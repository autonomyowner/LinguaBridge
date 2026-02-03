import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================

export type RoomRole = "owner" | "admin" | "member" | "viewer";

// Permission levels (higher = more permissions)
const ROLE_LEVELS: Record<RoomRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Check if a role has at least the required permission level
 */
export function hasPermission(userRole: RoomRole, requiredRole: RoomRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

/**
 * Get user's role in a room
 */
export async function getUserRoomRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  roomId: Id<"rooms">
): Promise<RoomRole | null> {
  const participant = await ctx.db
    .query("participants")
    .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
    .unique();

  return participant?.role ?? null;
}

/**
 * Check if user can perform action on room
 */
export async function canUserAccessRoom(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  roomId: Id<"rooms">,
  requiredRole: RoomRole = "viewer"
): Promise<boolean> {
  const role = await getUserRoomRole(ctx, userId, roomId);
  if (!role) return false;
  return hasPermission(role, requiredRole);
}

/**
 * Check if user is room owner
 */
export async function isRoomOwner(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  roomId: Id<"rooms">
): Promise<boolean> {
  const room = await ctx.db.get(roomId);
  return room?.creatorId === userId;
}

// ============================================
// PERMISSION CHECKS
// ============================================

export const PERMISSIONS = {
  // Room permissions
  ROOM_VIEW: "room:view" as const,
  ROOM_SPEAK: "room:speak" as const,
  ROOM_MANAGE: "room:manage" as const,
  ROOM_DELETE: "room:delete" as const,

  // Session permissions
  SESSION_START: "session:start" as const,
  SESSION_END: "session:end" as const,

  // Transcript permissions
  TRANSCRIPT_VIEW: "transcript:view" as const,
  TRANSCRIPT_EXPORT: "transcript:export" as const,

  // Admin permissions
  ADMIN_USERS: "admin:users" as const,
  ADMIN_ROOMS: "admin:rooms" as const,
} as const;

type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role-to-permission mapping
const ROLE_PERMISSIONS: Record<RoomRole, Permission[]> = {
  viewer: [
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.TRANSCRIPT_VIEW,
  ],
  member: [
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.ROOM_SPEAK,
    PERMISSIONS.TRANSCRIPT_VIEW,
    PERMISSIONS.TRANSCRIPT_EXPORT,
  ],
  admin: [
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.ROOM_SPEAK,
    PERMISSIONS.ROOM_MANAGE,
    PERMISSIONS.SESSION_START,
    PERMISSIONS.SESSION_END,
    PERMISSIONS.TRANSCRIPT_VIEW,
    PERMISSIONS.TRANSCRIPT_EXPORT,
  ],
  owner: [
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.ROOM_SPEAK,
    PERMISSIONS.ROOM_MANAGE,
    PERMISSIONS.ROOM_DELETE,
    PERMISSIONS.SESSION_START,
    PERMISSIONS.SESSION_END,
    PERMISSIONS.TRANSCRIPT_VIEW,
    PERMISSIONS.TRANSCRIPT_EXPORT,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: RoomRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: RoomRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

// ============================================
// RATE LIMITING
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { maxRequests: 100, windowMs: 60000 }, // 100/min
  pro: { maxRequests: 1000, windowMs: 60000 }, // 1000/min
  enterprise: { maxRequests: 10000, windowMs: 60000 }, // 10000/min
  api: { maxRequests: 60, windowMs: 60000 }, // 60/min for API
};

/**
 * Simple in-memory rate limiter (for demo purposes)
 * In production, use Redis or a distributed rate limiter
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// ============================================
// AUTHORIZATION ERRORS
// ============================================

export class AuthorizationError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends Error {
  constructor(public resetAt: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}
