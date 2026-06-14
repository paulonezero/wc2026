// HTTP-only handler — manual "Generate snippet" trigger from the Admin UI.
// Admin-password gated. Routed at /api/generate-snippet. The 08:00 UK
// scheduled tick lives in generate-snippet.js.
import { runSnippet } from "./_snippetRunner.js";

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
  const result = await runSnippet({ source: "manual", force: true });
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config = { path: "/api/generate-snippet" };
