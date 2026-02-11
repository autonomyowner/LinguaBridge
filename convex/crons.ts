import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stale sessions every hour
// Sessions inactive for >2 hours are force-ended with minutes tracked
crons.interval(
  "cleanup stale sessions",
  { hours: 1 },
  internal.sessions.mutations.cleanupStaleSessions
);

export default crons;
