import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// ============================================
// AUTH ROUTES
// Handled by Convex Auth
// ============================================
auth.addHttpRoutes(http);

// ============================================
// HEALTH CHECK
// Simple endpoint to verify the backend is running
// ============================================
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: Date.now() }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
