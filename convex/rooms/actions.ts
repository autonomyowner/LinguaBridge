import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { SignJWT } from "jose";

/**
 * Generate a LiveKit access token for joining a room
 * This is an ACTION because it needs to use external libraries (jose)
 * and access environment variables
 */
export const generateLiveKitToken = action({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args): Promise<{ token: string; url: string }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get room details from database
    const room = await ctx.runQuery(api.rooms.queries.getById, {
      roomId: args.roomId,
    });

    if (!room) {
      throw new Error("Room not found");
    }

    // Get user details
    const user = await ctx.runQuery(api.users.queries.getCurrent, {});
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user can join (is participant)
    if (!room.userRole) {
      throw new Error("You must join the room first");
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error("LiveKit configuration missing");
    }

    // Determine permissions based on role
    const canPublish = room.userRole !== "viewer";
    const canSubscribe = true;

    // Create LiveKit JWT token
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 6 * 60 * 60; // 6 hour expiry

    const token = await new SignJWT({
      video: {
        room: room.livekitRoomName,
        roomJoin: true,
        canPublish,
        canSubscribe,
        canPublishData: canPublish,
      },
      sub: user._id,
      name: user.name ?? user.email.split("@")[0],
      iss: apiKey,
      nbf: now,
      exp,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(new TextEncoder().encode(apiSecret));

    // Update participant to online
    await ctx.runMutation(api.rooms.mutations.updateParticipant, {
      roomId: args.roomId,
      isOnline: true,
    });

    return { token, url: livekitUrl };
  },
});

/**
 * Generate a quick join token for guests (no account required)
 * Limited to public rooms only
 */
export const generateGuestToken = action({
  args: {
    roomId: v.id("rooms"),
    guestName: v.string(),
  },
  handler: async (ctx, args): Promise<{ token: string; url: string }> => {
    // Get room details
    const room = await ctx.runQuery(api.rooms.queries.getById, {
      roomId: args.roomId,
    });

    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.isPublic) {
      throw new Error("Guest access is only available for public rooms");
    }

    // Get LiveKit credentials
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error("LiveKit configuration missing");
    }

    // Create guest token (view only)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 1 * 60 * 60; // 1 hour expiry for guests

    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const token = await new SignJWT({
      video: {
        room: room.livekitRoomName,
        roomJoin: true,
        canPublish: false, // Guests can only listen
        canSubscribe: true,
        canPublishData: false,
      },
      sub: guestId,
      name: args.guestName,
      iss: apiKey,
      nbf: now,
      exp,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(new TextEncoder().encode(apiSecret));

    return { token, url: livekitUrl };
  },
});
