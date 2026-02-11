import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { SignJWT } from "jose";

/**
 * Generate a LiveKit access token for joining a room
 * Requires authentication — guests are blocked
 */
export const generateLiveKitToken = action({
  args: {
    roomId: v.id("rooms"),
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

    // Require authenticated user
    const user = await ctx.runQuery(api.users.queries.getCurrent, {});
    if (!user) {
      throw new Error("Authentication required to join a translation room");
    }

    const participantId = user._id;
    const participantName = user.name ?? user.email?.split("@")[0] ?? "User";
    const canPublish = room.userRole !== "viewer";

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

    await ctx.runMutation(api.rooms.mutations.updateParticipant, {
      roomId: args.roomId,
      isOnline: true,
    });

    return { token, url: livekitUrl };
  },
});

/**
 * Get Gemini API key for authenticated users only
 * The Gemini Live API requires a direct WebSocket from the browser,
 * so we provide the key server-side only to authenticated users with valid sessions.
 */
export const getGeminiApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ apiKey: string }> => {
    // Require authentication
    const user = await ctx.runQuery(api.users.queries.getCurrent, {});
    if (!user) {
      throw new Error("Authentication required");
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("Gemini API key not configured");
    }

    return { apiKey: geminiApiKey };
  },
});

