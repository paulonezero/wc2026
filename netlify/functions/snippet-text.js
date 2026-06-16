// Public read-only endpoint for the current morning snippet, as plain text.
// Route: GET /api/snippet.txt → text/plain of state.snippet.body.
// Companion to snippet.js (JSON) — handier for piping into Slack/Teams/email.
import { getStore } from "@netlify/blobs";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method !== "GET") {
    return new Response("Method not allowed\n", {
      status: 405,
      headers: { ...CORS, "content-type": "text/plain; charset=utf-8" },
    });
  }

  const state = await getStore("wc26ss").get("pool", { type: "json" });
  const body = state?.snippet?.body;
  if (!body) {
    return new Response("no-snippet\n", {
      status: 404,
      headers: { ...CORS, "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(body.endsWith("\n") ? body : body + "\n", {
    status: 200,
    headers: { ...CORS, "content-type": "text/plain; charset=utf-8" },
  });
};

export const config = { path: "/api/snippet.txt" };
