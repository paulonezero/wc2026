// HTTP-only handler — manual "Fetch results now" trigger from the Admin UI.
// Admin-password gated. Routed at /api/fetch-results so the client just hits
// that one path. The recurring 2-hour pull lives in fetch-results.js.
import { runIngest } from "./_ingest.js";

const adminPassword = () => process.env.ADMIN_PASSWORD || "2026";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.password !== adminPassword()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await runIngest();
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config = { path: "/api/fetch-results" };
