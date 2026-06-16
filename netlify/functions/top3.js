// Public read endpoint at /api/top3 — top 3 players by win odds and top 3
// players by wooden-spoon odds, with their probabilities. Sibling of
// snippet.js, designed for the same external consumers (Teams posts,
// dashboards, scripts).

import { getStore } from "@netlify/blobs";
import { formMap, woodenSpoonProbsFrom, playerSpoonProbsFrom } from "./_oddsEngine.js";
import { teamWinProbsFrom, playerWinProbsFrom } from "./_snippetGenerator.js";

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

function top3(players, probs) {
  return [...players]
    .sort((a, b) => (probs[b.id] || 0) - (probs[a.id] || 0))
    .slice(0, 3)
    .map(p => ({ playerId: p.id, name: p.name, probability: probs[p.id] || 0 }));
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 204);
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const state = await getStore("wc26ss").get("pool", { type: "json" });
  const generatedAt = new Date().toISOString();
  const players = state?.players || [];

  if (!players.length || !state?.draw?.done) {
    return json({ generatedAt, winners: [], spoons: [] });
  }

  const form = formMap(state);
  const teamProbs = teamWinProbsFrom(state, form);
  const playerWin = playerWinProbsFrom(state, teamProbs);
  const teamSpoon = woodenSpoonProbsFrom(state);
  const playerSpoon = playerSpoonProbsFrom(state, teamSpoon);

  return json({
    generatedAt,
    winners: top3(players, playerWin),
    spoons: top3(players, playerSpoon),
  });
};

export const config = { path: "/api/top3" };
