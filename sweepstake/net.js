/* ============================================================================
   WC2026 SS — network layer
   Talks to the Netlify backend (/api/pool) when deployed; falls back to
   localStorage when there's no backend (preview / offline / opened as a file).
   Same index.html works in both worlds.
   ========================================================================== */
(function () {
  "use strict";
  const API = "/api/pool";
  let _mode = null; // 'remote' | 'local'

  function localState() { return window.Store.load() || window.Store.defaultState(); }

  // fill in any missing pieces so the UI never hits an undefined
  function normalize(st) {
    const d = window.Store.defaultState();
    st = Object.assign({}, d, st || {});
    if (!st.teams || !Object.keys(st.teams).length) st.teams = window.Store.freshTeams();
    if (!st.draw) st.draw = { done: false, assignments: {}, order: [] };
    if (!st.scores) st.scores = {};
    if (!Array.isArray(st.players)) st.players = [];
    return st;
  }

  async function post(body) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error(data.error || ("HTTP " + r.status)); err.status = r.status; throw err; }
    return data;
  }

  // first load: probe the backend; decide remote vs local
  async function init() {
    if (_mode) return getState();
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch(API, { headers: { accept: "application/json" }, signal: ctl.signal });
      clearTimeout(to);
      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.includes("json")) { _mode = "remote"; return normalize(await r.json()); }
    } catch (e) {}
    _mode = "local";
    return normalize(localState());
  }

  async function getState() {
    if (_mode === "remote") {
      const r = await fetch(API, { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error("load failed");
      return normalize(await r.json());
    }
    return normalize(localState());
  }

  async function signup(name) {
    if (_mode === "remote") {
      const data = await post({ action: "signup", name });
      return { state: normalize(data.state), you: data.you };
    }
    const s = localState();
    const id = window.Store.signUp(s, name);
    window.Store.save(s);
    return { state: normalize(s), you: id };
  }

  async function save(state, password) {
    if (_mode === "remote") {
      const data = await post({ action: "save", password, state });
      return normalize(data.state);
    }
    window.Store.save(state);
    return normalize(state);
  }

  function bumpDonate(name) {
    if (_mode !== "remote") return;
    post({ action: "bump", name }).catch(() => {});
  }

  // Trigger the scheduled results-fetcher on demand. Returns the function's
  // summary payload ({ ok, scoresWritten, eliminations, warnings, details, at }).
  // Only meaningful in remote mode — no local fallback (no API key client-side).
  async function fetchResultsNow(password) {
    if (_mode !== "remote") throw new Error("Auto-fetch only works on the deployed site.");
    const r = await fetch("/api/fetch-results", {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify({ password }),
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error(data.error || ("HTTP " + r.status)); err.status = r.status; throw err; }
    return data;
  }

  async function verify(password, state) {
    if (_mode === "remote") {
      try { await post({ action: "verify", password }); return true; }
      catch (e) { return false; }
    }
    return String(password) === String((state && state.adminPin) || "2026");
  }

  window.Net = { init, getState, signup, save, verify, bumpDonate, fetchResultsNow, normalize, getMode: () => _mode };
})();
