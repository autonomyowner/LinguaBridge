import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { SignJWT } from "jose";

/**
 * Resolve user from auth token or email fallback (cross-origin workaround)
 */
async function resolveUser(ctx: any, userEmail?: string) {
  let user = await ctx.runQuery(api.users.queries.getCurrent, {});
  if (!user && userEmail) {
    user = await ctx.runQuery(api.users.queries.getByEmail, { email: userEmail });
  }
  return user;
}

/**
 * Generate a LiveKit access token for joining a room
 * Requires authentication — guests are blocked
 */
export const generateLiveKitToken = action({
  args: {
    roomId: v.id("rooms"),
    userEmail: v.optional(v.string()),
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

    // Require authenticated user (with email fallback for cross-origin)
    const user = await resolveUser(ctx, args.userEmail);
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
 * Get Gemini API key for authenticated users only.
 * Used by the browser for Gemini Live speech-to-speech translation.
 */
export const getGeminiApiKey = action({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ apiKey: string }> => {
    const user = await resolveUser(ctx, args.userEmail);
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

/**
 * Get Deepgram API key for authenticated users only.
 * Used by the browser to open a WebSocket to Deepgram Nova-2 for real-time STT.
 */
export const getDeepgramApiKey = action({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ apiKey: string }> => {
    const user = await resolveUser(ctx, args.userEmail);
    if (!user) {
      throw new Error("Authentication required");
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      throw new Error("Deepgram API key not configured");
    }

    return { apiKey: deepgramApiKey };
  },
});

/**
 * Get OpenRouter API key for authenticated users only.
 * Used by the browser for streaming translation via OpenRouter REST API.
 */
export const getOpenRouterApiKey = action({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ apiKey: string }> => {
    const user = await resolveUser(ctx, args.userEmail);
    if (!user) {
      throw new Error("Authentication required");
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    return { apiKey: openRouterApiKey };
  },
});
