// Plain-text twin of top3.js — same data, formatted for shell pipelines and
// chat clients. Two paragraphs: winner odds top 3, then wooden spoon top 3.

import { getStore } from "@netlify/blobs";
import { formMap, woodenSpoonProbsFrom, playerSpoonProbsFrom } from "./_oddsEngine.js";
import { teamWinProbsFrom, playerWinProbsFrom } from "./_snippetGenerator.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

const TEXT = { ...CORS, "content-type": "text/plain; charset=utf-8" };

// Mirrors fp2 in sweepstake/ui.jsx: 1dp under 10%, else whole percent.
function fp2(x) {
  return (x * 100).toFixed(x < 0.1 ? 1 : 0) + "%";
}

function top3Lines(players, probs) {
  return [...players]
    .sort((a, b) => (probs[b.id] || 0) - (probs[a.id] || 0))
    .slice(0, 3)
    .map((p, i) => `${i + 1}. ${p.name} — ${fp2(probs[p.id] || 0)}`);
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method !== "GET") {
    return new Response("Method not allowed\n", { status: 405, headers: TEXT });
  }

  const state = await getStore("wc26ss").get("pool", { type: "json" });
  const players = state?.players || [];

  if (!players.length || !state?.draw?.done) {
    return new Response("no-draw\n", { status: 200, headers: TEXT });
  }

  const form = formMap(state);
  const teamProbs = teamWinProbsFrom(state, form);
  const playerWin = playerWinProbsFrom(state, teamProbs);
  const teamSpoon = woodenSpoonProbsFrom(state);
  const playerSpoon = playerSpoonProbsFrom(state, teamSpoon);

  const body = [
    "Winner odds (top 3):",
    ...top3Lines(players, playerWin),
    "",
    "Wooden spoon odds (top 3):",
    ...top3Lines(players, playerSpoon),
    "",
  ].join("\n");

  return new Response(body, { status: 200, headers: TEXT });
};

export const config = { path: "/api/top3.txt" };
