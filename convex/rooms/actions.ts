import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { SignJWT } from "jose";

/**
 * Generate a LiveKit access token for joining a room
 * Works for both authenticated users and guests
 */
export const generateLiveKitToken = action({
  args: {
    roomId: v.id("rooms"),
    guestName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ token: string; url: string }> => {
    // Get room details from database
    const room = await ctx.runQuery(api.rooms.queries.getById, {
      roomId: args.roomId,
    });

    if (!room) {
      throw new Error("Room not found");
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error("LiveKit configuration missing");
    }

    // Try to get authenticated user
    const user = await ctx.runQuery(api.users.queries.getCurrent, {});

    // Determine identity and name
    let participantId: string;
    let participantName: string;
    let canPublish = true;

    if (user) {
      // Authenticated user
      participantId = user._id;
      participantName = user.name ?? user.email?.split("@")[0] ?? "User";
      canPublish = room.userRole !== "viewer";
    } else {
      // Guest user
      participantId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      participantName = args.guestName ?? "Guest";
      canPublish = true; // Allow guests to speak in demo mode
    }

    // Create LiveKit JWT token
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 6 * 60 * 60; // 6 hour expiry

    const token = await new SignJWT({
      video: {
        room: room.livekitRoomName,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
        canPublishData: canPublish,
      },
      sub: participantId,
      name: participantName,
      iss: apiKey,
      nbf: now,
      exp,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(new TextEncoder().encode(apiSecret));

    // Update participant to online (only for authenticated users)
    if (user) {
      await ctx.runMutation(api.rooms.mutations.updateParticipant, {
        roomId: args.roomId,
        isOnline: true,
      });
    }

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

    // Create guest token with full permissions for demo
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 2 * 60 * 60; // 2 hour expiry for guests

    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const token = await new SignJWT({
      video: {
        room: room.livekitRoomName,
        roomJoin: true,
        canPublish: true, // Allow guests to speak
        canSubscribe: true,
        canPublishData: true,
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
