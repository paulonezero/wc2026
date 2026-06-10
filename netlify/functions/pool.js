// ============================================================================
// WC2026 SS — Netlify Function (shared pool state via Netlify Blobs)
// Routes: GET /api/pool            -> current pool state (public, read-only)
//         POST /api/pool {action}  -> signup (public) | verify | save (admin)
// Admin actions require the password to match the ADMIN_PASSWORD env var.
// ============================================================================
import { getStore } from "@netlify/blobs";

const PALETTE = ["#FF2E63", "#2347FF", "#16A34A", "#FFB22E", "#9333EA", "#06B6D4",
                 "#EC4899", "#0EA5E9", "#F97316", "#65A30D", "#DC2626", "#0D9488"];
const MAX_PLAYERS = 24; // hard ceiling, never surfaced in the UI

const adminPassword = () => process.env.ADMIN_PASSWORD || "2026";

function defaultState() {
  return {
    v: 2,
    poolName: "The Office Pool",
    pot: 240,
    currency: "£",
    phase: "lobby",
    drawDate: "2026-06-11",
    players: [],
    draw: { done: false, assignments: {}, order: [] },
    teams: {},        // client populates the 48 team slots on load
    scores: {},
    currentDay: 1,
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
  });
}

export default async (req) => {
  const store = getStore("wc26ss");

  if (req.method === "OPTIONS") return json({}, 204);

  if (req.method === "GET") {
    let state = await store.get("pool", { type: "json" });
    if (!state) { state = defaultState(); await store.setJSON("pool", state); }
    return json(state);
  }

  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch (e) {}
    const action = body.action;
    let state = (await store.get("pool", { type: "json" })) || defaultState();

    // --- public: sign up (only before the draw) ---------------------------
    if (action === "signup") {
      const name = String(body.name || "").trim();
      if (!name) return json({ error: "Pick a username." }, 400);
      if (state.draw && state.draw.done) return json({ error: "The draw has already happened." }, 409);
      if (state.players.length >= MAX_PLAYERS) return json({ error: "Sign-ups are closed." }, 409);
      if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase()))
        return json({ error: "That name is already taken." }, 409);
      const id = "p" + Date.now() + Math.floor(Math.random() * 999);
      const color = PALETTE[state.players.length % PALETTE.length];
      state.players.push({ id, name, color, joinedAt: Date.now() });
      await store.setJSON("pool", state);
      return json({ state, you: id });
    }

    // --- admin: check the password ----------------------------------------
    if (action === "verify") {
      return body.password === adminPassword() ? json({ ok: true }) : json({ error: "Wrong code." }, 401);
    }

    // --- admin: overwrite the whole pool ----------------------------------
    if (action === "save") {
      if (body.password !== adminPassword()) return json({ error: "Unauthorized" }, 401);
      if (!body.state || typeof body.state !== "object") return json({ error: "Bad state" }, 400);
      await store.setJSON("pool", body.state);
      return json({ state: body.state });
    }

    return json({ error: "Unknown action" }, 400);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/pool" };
