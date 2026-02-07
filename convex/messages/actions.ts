"use node";
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../_generated/api";

/**
 * Translate a message using OpenRouter API (Gemini Flash model)
 * Supports English ↔ Arabic translation
 */
export const translateMessage = action({
  args: {
    text: v.string(),
    fromLang: v.string(), // "en" or "ar"
    toLang: v.string(), // "en" or "ar"
  },
  handler: async (ctx, { text, fromLang, toLang }) => {
    // Skip if same language or empty text
    if (fromLang === toLang || !text.trim()) {
      return text;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY not set");
      return text; // Return original on configuration error
    }

    const fromLangName = fromLang === "ar" ? "Arabic" : "English";
    const toLangName = toLang === "ar" ? "Arabic" : "English";

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://travoices.xyz",
          "X-Title": "TRAVoices Chat Translation",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the following text from ${fromLangName} to ${toLangName}. Return ONLY the translated text, nothing else. Preserve the original tone and meaning. Do not add any explanations or notes.`
            },
            { role: "user", content: text }
          ],
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 2000,
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Translation API error:", error);
        return text; // Return original on API error
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim();

      if (!translatedText) {
        console.error("Empty translation response");
        return text;
      }

      return translatedText;
    } catch (error) {
      console.error("Translation failed:", error);
      return text; // Return original on any error
    }
  }
});

/**
 * Detect the language of a text (simple heuristic for en/ar)
 */
export const detectLanguage = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, { text }) => {
    // Simple Arabic detection using Unicode range
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    const arabicCharCount = (text.match(arabicPattern) || []).length;
    const totalChars = text.replace(/\s/g, "").length;

    // If more than 30% Arabic characters, consider it Arabic
    if (totalChars > 0 && arabicCharCount / totalChars > 0.3) {
      return "ar";
    }
    return "en";
  }
});

/**
 * Helper function to translate text (used by sendTextWithTranslation)
 */
async function performTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
  // Skip if same language or empty text
  if (fromLang === toLang || !text.trim()) {
    return text;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not set");
    return text;
  }

  const fromLangName = fromLang === "ar" ? "Arabic" : "English";
  const toLangName = toLang === "ar" ? "Arabic" : "English";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://travoices.xyz",
        "X-Title": "TRAVoices Chat Translation",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text from ${fromLangName} to ${toLangName}. Return ONLY the translated text, nothing else. Preserve the original tone and meaning. Do not add any explanations or notes.`
          },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Translation API error:", error);
      return text;
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      console.error("Empty translation response");
      return text;
    }

    return translatedText;
  } catch (error) {
    console.error("Translation failed:", error);
    return text;
  }
}

/**
 * Helper function to detect language
 */
function detectLang(text: string): string {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const arabicCharCount = (text.match(arabicPattern) || []).length;
  const totalChars = text.replace(/\s/g, "").length;

  if (totalChars > 0 && arabicCharCount / totalChars > 0.3) {
    return "ar";
  }
  return "en";
}

/**
 * Send a text message with automatic translation
 * Stores original content + translated version for the receiver
 */
export const sendTextWithTranslation = action({
  args: {
    friendId: v.id("users"),
    content: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.id("messages"),
  }),
  handler: async (ctx, { friendId, content }): Promise<{ success: boolean; messageId: any }> => {
    let translatedContent: string | undefined = undefined;

    // Get the recipient's preferred chat language
    const recipientLang = await ctx.runQuery(api.messages.queries.getRecipientLanguage, {
      friendId,
    });

    if (recipientLang) {
      // Detect the source language from the message
      const sourceLang = detectLang(content);

      // Translate if languages are different
      if (sourceLang !== recipientLang) {
        translatedContent = await performTranslation(content, sourceLang, recipientLang);
        // If translation failed (returned same text), don't store it
        if (translatedContent === content) {
          translatedContent = undefined;
        }
      }
    }

    // Send message with both original and translated content
    const result: { success: boolean; messageId: any } = await ctx.runMutation(
      api.messages.mutations.sendText,
      {
        friendId,
        content,
        translatedContent,
      }
    );

    return result;
  }
});
