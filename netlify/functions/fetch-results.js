// Scheduled-only handler — runs every 30 minutes. Must not declare a custom
// path (Netlify rejects scheduled+path combos); the manual HTTP trigger lives
// in fetch-results-now.js. Both call the same runIngest() in _ingest.js.
//
// runIngest() has its own skip-when-nothing-finished check, so most of these
// 30-min ticks are no-ops (no football-data call) outside actual match windows.
import { runIngest } from "./_ingest.js";

export default async () => {
  const result = await runIngest();
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config = { schedule: "*/30 * * * *" };
