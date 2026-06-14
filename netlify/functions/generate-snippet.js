// Scheduled-only handler — fires at 07:00 UTC every day. That's 08:00 UK
// during BST (tournament window: 11 Jun – 20 Jul 2026 is entirely BST). After
// the tournament this drifts to 07:00 GMT in October; immaterial since there
// are no matches to write up.
//
// The manual HTTP trigger lives in generate-snippet-now.js — Netlify rejects
// scheduled+path on the same function.
import { runSnippet } from "./_snippetRunner.js";

export default async () => {
  const result = await runSnippet({ source: "cron" });
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config = { schedule: "0 7 * * *" };
