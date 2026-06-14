// Scheduled-only handler — runs every 2 hours. Must not declare a custom path
// (Netlify rejects scheduled+path combos); the manual HTTP trigger lives in
// fetch-results-now.js. Both call the same runIngest() in _ingest.js.
import { runIngest } from "./_ingest.js";

export default async () => {
  const result = await runIngest();
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config = { schedule: "0 */2 * * *" };
