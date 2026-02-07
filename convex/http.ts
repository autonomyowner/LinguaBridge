import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// ============================================
// CORS CONFIGURATION
// Allowed origins for auth requests
// ============================================
const allowedOrigins = [
  "https://www.travoices.xyz",
  "https://travoices.xyz",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null) {
  // Check if origin is allowed
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Helper to create CORS preflight handler
const createOptionsHandler = () =>
  httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  });

// ============================================
// AUTH ROUTES - CORS PREFLIGHT HANDLERS
// ============================================
http.route({
  path: "/api/auth/get-session",
  method: "OPTIONS",
  handler: createOptionsHandler(),
});

http.route({
  path: "/api/auth/sign-in/email",
  method: "OPTIONS",
  handler: createOptionsHandler(),
});

http.route({
  path: "/api/auth/sign-up/email",
  method: "OPTIONS",
  handler: createOptionsHandler(),
});

http.route({
  path: "/api/auth/sign-out",
  method: "OPTIONS",
  handler: createOptionsHandler(),
});

// Google OAuth (for future use)
http.route({
  path: "/api/auth/sign-in/social",
  method: "OPTIONS",
  handler: createOptionsHandler(),
});

http.route({
  path: "/api/auth/callback/google",
  method: "OPTIONS",
  handler: createOptionsHandler(),
});

// ============================================
// REGISTER BETTER AUTH ROUTES
// This handles all /api/auth/* endpoints
// ============================================
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins,
  },
});

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
