import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

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
 * Clone a voice using Cartesia API
 * Receives base64 audio from the client, sends to Cartesia, returns voice ID
 */
export const cloneVoice = action({
  args: {
    audioBase64: v.string(),
    language: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ cartesiaVoiceId: string }> => {
    const user = await resolveUser(ctx, args.userEmail);
    if (!user) {
      throw new Error("Authentication required");
    }

    const cartesiaApiKey = process.env.CARTESIA_API_KEY;
    if (!cartesiaApiKey) {
      throw new Error("Cartesia API key not configured");
    }

    // Convert base64 to binary
    const audioBytes = Uint8Array.from(atob(args.audioBase64), (c) => c.charCodeAt(0));

    // Cartesia wants simple language code (e.g., "en" not "en-US")
    const shortLang = args.language.split("-")[0];

    const name = user.name || user.email?.split("@")[0] || "User Voice";

    // Build multipart/form-data body manually (no FormData in Convex runtime)
    const boundary = "----CartesiaBoundary" + Date.now();
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];

    // clip field (audio file) — browser records webm/opus
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="clip"; filename="voice.webm"\r\nContent-Type: audio/webm\r\n\r\n`
    ));
    parts.push(audioBytes);
    parts.push(encoder.encode("\r\n"));

    // name field
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`
    ));

    // language field
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${shortLang}\r\n`
    ));

    // Closing boundary
    parts.push(encoder.encode(`--${boundary}--\r\n`));

    // Combine all parts into single buffer
    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.length;
    }

    // Send to Cartesia clone endpoint
    const response = await fetch("https://api.cartesia.ai/voices/clone", {
      method: "POST",
      headers: {
        "Cartesia-Version": "2025-04-16",
        "Authorization": `Bearer ${cartesiaApiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cartesia voice cloning failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const cartesiaVoiceId = result.id;

    if (!cartesiaVoiceId) {
      throw new Error("Cartesia did not return a voice ID");
    }

    // Save the voice clone in our database
    await ctx.runMutation(api.voices.mutations.saveVoiceClone, {
      cartesiaVoiceId,
      language: args.language,
      userEmail: args.userEmail,
    });

    return { cartesiaVoiceId };
  },
});

/**
 * Get Cartesia API key for authenticated users
 * Used by the browser to open a WebSocket to Cartesia for real-time TTS
 */
export const getCartesiaApiKey = action({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ apiKey: string }> => {
    const user = await resolveUser(ctx, args.userEmail);
    if (!user) {
      throw new Error("Authentication required");
    }

    const cartesiaApiKey = process.env.CARTESIA_API_KEY;
    if (!cartesiaApiKey) {
      throw new Error("Cartesia API key not configured");
    }

    return { apiKey: cartesiaApiKey };
  },
});

/**
 * Get a default Cartesia voice ID for users without a voice clone.
 * Tries: (1) Fetch from Cartesia API, (2) Use known public voice ID fallback.
 */
export const getDefaultCartesiaVoiceId = action({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ voiceId: string | null }> => {
    const user = await resolveUser(ctx, args.userEmail);
    if (!user) {
      throw new Error("Authentication required");
    }

    const cartesiaApiKey = process.env.CARTESIA_API_KEY;
    if (!cartesiaApiKey) {
      console.warn("No Cartesia API key configured");
      return { voiceId: null };
    }

    // Known public Cartesia voice IDs (fallbacks if API returns empty)
    const FALLBACK_VOICE_IDS = [
      "79a125e8-cd45-4c13-8a67-188112f4dd22", // Confident British Man
      "a167e0f3-df7e-4571-aa90-17f1e466e7e4", // Classy British Man
      "694f9389-aac1-45b6-b726-9d9369183238", // Newsman
    ];

    try {
      const response = await fetch("https://api.cartesia.ai/voices", {
        headers: {
          "Cartesia-Version": "2025-04-16",
          "Authorization": `Bearer ${cartesiaApiKey}`,
        },
      });

      if (!response.ok) {
        console.error("Cartesia API error:", response.status, await response.text());
        console.log("Using fallback voice ID");
        return { voiceId: FALLBACK_VOICE_IDS[0] };
      }

      const data = await response.json();
      console.log("Cartesia API response:", JSON.stringify(data).slice(0, 200));

      // Handle different response formats (API may return {data:[...]}, {voices:[...]}, or [...])
      let voices = Array.isArray(data) ? data : (data.data || data.voices || []);

      if (voices.length > 0) {
        console.log(`Found ${voices.length} Cartesia voices, using first one`);
        return { voiceId: voices[0].id };
      }

      // No voices found in API, use fallback
      console.log("No voices in API response, using fallback voice ID");
      return { voiceId: FALLBACK_VOICE_IDS[0] };
    } catch (e) {
      console.error("Error fetching Cartesia voices:", e);
      console.log("Using fallback voice ID");
      return { voiceId: FALLBACK_VOICE_IDS[0] };
    }
  },
});

/**
 * List all available Cartesia voices for voice picker UI.
 * Returns voices from the Cartesia API so users can choose male/female/different styles.
 */
export const listVoices = action({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ voices: Array<{ id: string; name: string; description?: string }> }> => {
    const user = await resolveUser(ctx, args.userEmail);
    if (!user) {
      throw new Error("Authentication required");
    }

    const cartesiaApiKey = process.env.CARTESIA_API_KEY;
    if (!cartesiaApiKey) {
      throw new Error("Cartesia API key not configured");
    }

    try {
      const response = await fetch("https://api.cartesia.ai/voices", {
        headers: {
          "Cartesia-Version": "2025-04-16",
          "Authorization": `Bearer ${cartesiaApiKey}`,
        },
      });

      if (!response.ok) {
        console.error("Cartesia list voices error:", response.status);
        return { voices: [] };
      }

      const data = await response.json();
      let rawVoices = Array.isArray(data) ? data : (data.data || data.voices || []);

      const voices = rawVoices.map((v: any) => ({
        id: v.id,
        name: v.name || "Unknown Voice",
        description: v.description || "",
      }));

      console.log(`[listVoices] Returning ${voices.length} voices`);
      return { voices };
    } catch (e) {
      console.error("Error listing Cartesia voices:", e);
      return { voices: [] };
    }
  },
});
