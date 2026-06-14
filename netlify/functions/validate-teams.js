// HTTP-only handler — pre-flight check that every team in the football-data
// World Cup squad is resolvable via _teamMap.js. Run before the tournament
// (and any time the field changes) to catch unmapped names before they show
// up as silent warnings in the live results ingest.
import { TEAM_NAME_TO_CODE, codeFromName } from "./_teamMap.js";

const API_BASE = "https://api.football-data.org/v4";
const COMP_ID = () => process.env.WC_COMPETITION_ID || "2000";
const FETCH_TIMEOUT_MS = 15000;
const adminPassword = () => process.env.ADMIN_PASSWORD || "2026";

// Node fetch on serverless cold starts occasionally throws low-level socket
// errors before the request reaches the wire. One quick retry papers over
// those without adding meaningful latency to the happy path.
async function fetchWithRetry(url, headers) {
  try {
    return await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    await new Promise(r => setTimeout(r, 400));
    return await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "content-type": "application/json" },
    });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.password !== adminPassword()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "FOOTBALL_DATA_API_KEY not set" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }

  const url = `${API_BASE}/competitions/${COMP_ID()}/teams`;
  let res;
  try {
    res = await fetchWithRetry(url, { "X-Auth-Token": apiKey });
  } catch (e) {
    const cause = e.cause?.code || e.cause?.message || "";
    return new Response(JSON.stringify({
      ok: false,
      error: `fetch ${url} failed: ${e.name || "Error"} · ${e.message}${cause ? " · cause: " + cause : ""}`,
    }), { status: 500, headers: { "content-type": "application/json" } });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new Response(JSON.stringify({
      ok: false, error: `football-data ${res.status}`, body: text.slice(0, 500),
    }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const data = await res.json();
  const teams = data.teams || [];

  const mapped = [];
  const unmapped = [];
  for (const t of teams) {
    const name = t.name;
    const code = codeFromName(name);
    if (code) mapped.push({ name, code });
    else unmapped.push({ name, tla: t.tla, shortName: t.shortName });
  }

  // Also flag any codes in our map that DON'T appear in the API roster — would
  // suggest a team in our app isn't in football-data's competition squad.
  const apiCodes = new Set(mapped.map(m => m.code));
  const mappedCodes = new Set(Object.values(TEAM_NAME_TO_CODE));
  const missingFromApi = [...mappedCodes].filter(c => !apiCodes.has(c));

  return new Response(JSON.stringify({
    ok: true,
    total: teams.length,
    mappedCount: mapped.length,
    unmappedCount: unmapped.length,
    unmapped,
    missingFromApi,
    at: new Date().toISOString(),
  }), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
};

export const config = { path: "/api/validate-teams" };
