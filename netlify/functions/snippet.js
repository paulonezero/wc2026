// Public read-only endpoint for the current morning snippet.
// Route: GET /api/snippet → JSON of state.snippet (or {error:"no-snippet"}).
// Snippet body is already exposed via GET /api/pool; this just narrows the
// payload so other systems can curl it directly.
import { getStore } from "@netlify/blobs";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 204);
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const state = await getStore("wc26ss").get("pool", { type: "json" });
  const snippet = state?.snippet;
  if (!snippet || !snippet.body) return json({ error: "no-snippet" }, 404);

  return json({
    body: snippet.body,
    generatedAt: snippet.generatedAt,
    windowStart: snippet.windowStart,
    windowEnd: snippet.windowEnd,
    model: snippet.model,
    matchIds: snippet.matchIds || [],
    playersMentioned: snippet.playersMentioned || [],
    source: snippet.source || null,
    warning: snippet.warning,
  });
};

export const config = { path: "/api/snippet" };
