import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "../lib/utils";
import { canUserAccessRoom } from "../lib/permissions";

/**
 * Add a message to the transcript
 * Uses lenient auth — falls back to email lookup for cross-origin sessions.
 * Skips strict room permission check since the user is actively in the room
 * (already passed auth when generating LiveKit token + starting session).
 */
export const addMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    originalText: v.string(),
    translatedText: v.optional(v.string()),
    sourceLanguage: v.string(),
    targetLanguage: v.optional(v.string()),
    messageType: v.union(v.literal("speech"), v.literal("translation"), v.literal("system")),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.userEmail);
    if (!user) {
      // Silently skip — transcript saving is best-effort
      return { transcriptId: null };
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { transcriptId: null };
    }

    if (session.status !== "active") {
      return { transcriptId: null };
    }

    const now = Date.now();

    const transcriptId = await ctx.db.insert("transcripts", {
      sessionId: args.sessionId,
      roomId: session.roomId,
      speakerId: user._id,
      speakerName: user.name ?? user.email.split("@")[0],
      originalText: args.originalText,
      translatedText: args.translatedText,
      sourceLanguage: args.sourceLanguage,
      targetLanguage: args.targetLanguage,
      messageType: args.messageType,
      timestamp: now,
    });

    // Update analytics
    const todayDate = new Date().toISOString().split("T")[0];
    const existingAnalytics = await ctx.db
      .query("analytics")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", todayDate))
      .unique();

    const languages = new Set<string>();
    languages.add(args.sourceLanguage);
    if (args.targetLanguage) languages.add(args.targetLanguage);

    if (existingAnalytics) {
      const existingLangs = new Set(existingAnalytics.languagesUsed);
      languages.forEach((l) => existingLangs.add(l));

      await ctx.db.patch(existingAnalytics._id, {
        messagesTranslated: existingAnalytics.messagesTranslated + 1,
        languagesUsed: Array.from(existingLangs),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("analytics", {
        userId: user._id,
        date: todayDate,
        minutesUsed: 0,
        sessionsStarted: 0,
        messagesTranslated: 1,
        roomsCreated: 0,
        languagesUsed: Array.from(languages),
        updatedAt: now,
      });
    }

    return { transcriptId };
  },
});

/**
 * Add a system message to transcript
 */
export const addSystemMessage = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return;
    }

    await ctx.db.insert("transcripts", {
      sessionId: args.sessionId,
      roomId: session.roomId,
      speakerName: "System",
      originalText: args.text,
      sourceLanguage: "system",
      messageType: "system",
      timestamp: Date.now(),
    });
  },
});

/**
 * Add translation to existing message
 */
export const addTranslation = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    translatedText: v.string(),
    targetLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    const transcript = await ctx.db.get(args.transcriptId);
    if (!transcript) {
      throw new Error("Transcript not found");
    }

    await ctx.db.patch(args.transcriptId, {
      translatedText: args.translatedText,
      targetLanguage: args.targetLanguage,
    });

    return { success: true };
  },
});

/**
 * Delete a message (admin+ only)
 */
export const deleteMessage = mutation({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const transcript = await ctx.db.get(args.transcriptId);
    if (!transcript) {
      throw new Error("Transcript not found");
    }

    // Check permissions
    const canAccess = await canUserAccessRoom(ctx, user._id, transcript.roomId, "admin");
    if (!canAccess) {
      throw new Error("You don't have permission to delete messages");
    }

    await ctx.db.delete(args.transcriptId);

    return { success: true };
  },
});

/**
 * Bulk add messages (for importing)
 */
export const bulkAdd = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    messages: v.array(
      v.object({
        speakerName: v.string(),
        originalText: v.string(),
        translatedText: v.optional(v.string()),
        sourceLanguage: v.string(),
        targetLanguage: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return;
    }

    for (const msg of args.messages) {
      await ctx.db.insert("transcripts", {
        sessionId: args.sessionId,
        roomId: session.roomId,
        speakerName: msg.speakerName,
        originalText: msg.originalText,
        translatedText: msg.translatedText,
        sourceLanguage: msg.sourceLanguage,
        targetLanguage: msg.targetLanguage,
        messageType: "speech",
        timestamp: msg.timestamp,
      });
    }
  },
});
