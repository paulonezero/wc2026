// Shared orchestration for the morning snippet:
//   1. Load the pool blob.
//   2. Generate the snippet via _snippetGenerator.js.
//   3. Persist it back as state.snippet so the existing client poll picks it up.
//   4. Fire notifications (Teams / email) via _notify.js — opt-in via env vars.
//
// Called by:
//   - generate-snippet.js       (scheduled, 08:00 UK)
//   - generate-snippet-now.js   (manual, admin-gated)

import { getStore } from "@netlify/blobs";
import { generateSnippet } from "./_snippetGenerator.js";
import { dispatchSnippet } from "./_notify.js";

// Returns "YYYY-MM-DD" for a UTC ms instant, in the Europe/London timezone.
function ukDate(ms) {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export async function runSnippet({ source = "manual", force = false } = {}) {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const store = getStore("wc26ss");
  const state = await store.get("pool", { type: "json" });
  if (!state) {
    const summary = { ok: true, skipped: true, reason: "no-pool", at: nowIso };
    console.log("[snippet] skip", JSON.stringify(summary));
    return summary;
  }

  // Idempotency guard: if the scheduled tick fires more than once on the same
  // UK calendar day, only the first one calls the LLM. Manual triggers
  // (`force=true` or `source="manual"`) always regenerate.
  if (source === "cron" && !force && state.snippet?.generatedAt) {
    const lastUkDate = ukDate(Date.parse(state.snippet.generatedAt));
    if (lastUkDate === ukDate(nowMs)) {
      const summary = { ok: true, skipped: true, reason: "already-generated-today", at: nowIso };
      console.log("[snippet] skip", JSON.stringify(summary));
      return summary;
    }
  }

  const gen = await generateSnippet({ state, nowMs });
  if (!gen.ok) {
    console.log("[snippet] gen-failed", JSON.stringify({ error: gen.error, source, at: nowIso }));
    return { ok: false, error: gen.error, at: nowIso };
  }

  const snippet = { ...gen.snippet, source };
  state.snippet = snippet;
  await store.setJSON("pool", state);

  // Best-effort dispatch — never throws.
  const dispatch = await dispatchSnippet(snippet, state);

  const summary = {
    ok: true,
    snippet: { ...snippet, body: undefined, bodyChars: snippet.body?.length || 0 },
    dispatch,
    state,
    at: nowIso,
  };
  console.log("[snippet] ok", JSON.stringify({
    source,
    matchCount: snippet.matchIds?.length || 0,
    playersMentioned: snippet.playersMentioned?.length || 0,
    bodyChars: snippet.body?.length || 0,
    model: snippet.model,
    dispatch,
    at: nowIso,
  }));
  return summary;
}
