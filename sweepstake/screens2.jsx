/* ============================================================================
   SCREENS · 2 — Standings, Teams, Admin
   ========================================================================== */
const { playerWinProbs, teamWinProbs, teamsOfPlayer: teamsOf, aliveCount: aliveN,
        teamByCode: tByCode, fmtPct: fp2, TEAMS: ALLT, GROUP_LETTERS: GL,
        CONFED_LABEL: CFL, fixturesOnDay: fxDay, fmtDate: fDate, TOTAL_DAYS: TDAYS,
        mockScore, isAlive } = window.SS;

/* ========================================================================== */
/*  STANDINGS — player leaderboard + win odds                                 */
/* ========================================================================== */
function Standings({ state, go }) {
  const [open, setOpen] = useState(null);
  const [showTeams, setShowTeams] = useState(true);
  if (!state.draw.done)
    return <Empty title="No standings yet">The leaderboard wakes up once the teams are drawn.
      <div style={{ marginTop: 18 }}><Btn kind="primary" onClick={() => go("admin")}>Go to Admin</Btn></div></Empty>;

  const pwp = playerWinProbs(state);
  const tp = teamWinProbs(state);
  const ranked = [...state.players].sort((a, b) => pwp[b.id] - pwp[a.id]);
  const leader = ranked[0];
  const teamsByOdds = ALLT.filter(t => isAlive(state, t.code)).sort((a, b) => tp[b.code] - tp[a.code]);
  const maxT = tp[teamsByOdds[0]?.code] || 1;
  const potOf = prob => state.currency + (state.pot ? Math.round(prob * state.pot) : "?");

  return (
    <div className="fadein">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div className="display" style={{ fontSize: "clamp(26px,5.5vw,34px)", textTransform: "uppercase" }}>The Standings</div>
          <div className="muted" style={{ fontSize: 14 }}>
            Each player's chance of owning the champion · {state.currency}{state.pot || "?"} pot
          </div>
        </div>
      </div>

      {/* podium */}
      <div className="podium">
        {[1, 0, 2].map(slot => {
          const p = ranked[slot]; if (!p) return <div key={slot}></div>;
          const place = slot + 1;
          const h = place === 1 ? 150 : place === 2 ? 120 : 100;
          const col = place === 1 ? "var(--gold)" : place === 2 ? "var(--paper-3)" : "#E3B57A";
          return (
            <div key={slot} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", minWidth: 0, width: "100%" }}>
              <Avatar player={p} size={place === 1 ? 56 : 44} />
              <div className="podium-name" style={{ fontSize: place === 1 ? 19 : 16 }}>{p.name}</div>
              <div className="display" style={{ fontSize: place === 1 ? 26 : 20, color: "var(--pop)", marginBottom: 4 }}>{fp2(pwp[p.id])}</div>
              <div style={{ width: "100%", height: h, background: col, border: "3px solid var(--ink)",
                borderRadius: "12px 12px 0 0", marginTop: 4, display: "flex", alignItems: "flex-start",
                justifyContent: "center", paddingTop: 8, boxShadow: "var(--shadow-sm)" }}>
                <span className="display" style={{ fontSize: 34 }}>{place}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* full table */}
      <div className="card" style={{ padding: 8 }}>
        {ranked.map((p, i) => {
          const mine = teamsOf(state, p.id);
          const alive = aliveN(state, p.id);
          const isOpen = open === p.id;
          const isLeader = p.id === leader.id;
          const isMe = p.id === state.me;
          return (
            <div key={p.id} style={{ borderBottom: i < ranked.length - 1 ? "2px dashed rgba(26,22,17,.16)" : "none" }}>
              <div onClick={() => setOpen(isOpen ? null : p.id)}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", cursor: "pointer",
                  background: isLeader ? "var(--gold)" : "transparent", borderRadius: 12 }}>
                <div className="display" style={{ fontSize: 30, width: 40, textAlign: "center" }}>{i + 1}</div>
                <Avatar player={p} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="display" style={{ fontSize: 19, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}{isMe && <span className="tag" style={{ marginLeft: 8, background: "var(--pop)", color: "#fff", borderColor: "var(--ink)" }}>you</span>}
                  </div>
                  <div className="teamchips" style={{ marginTop: 6 }}>
                    {mine.map(c => <TeamChip key={c} team={tByCode(c)} dead={!isAlive(state, c)} />)}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 92 }}>
                  <div className="mono muted" style={{ fontSize: 11 }}>{alive}/{mine.length} alive</div>
                  <div className="display" style={{ fontSize: 28, lineHeight: 1 }}>{fp2(pwp[p.id])}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>~{potOf(pwp[p.id])} EV</div>
                </div>
                <span className="mono" style={{ fontSize: 16, opacity: .5, width: 16 }}>{isOpen ? "▾" : "▸"}</span>
              </div>
              {isOpen &&
                <div className="fadein" style={{ padding: "4px 16px 18px", display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                  {mine.sort((a, b) => tp[b] - tp[a]).map(c =>
                    <Sticker key={c} team={tByCode(c)} prob={tp[c]} hover={false} status={state.teams[c]?.status || "alive"} />)}
                </div>}
            </div>
          );
        })}
      </div>
      <div className="mono muted" style={{ fontSize: 12, textAlign: "center", margin: "14px 0 6px" }}>
        Last team standing — your % is the combined chance one of your teams lifts the trophy. Tap a player to see their teams.
      </div>

      {/* team win odds */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 30 }}>
        <SectLabel>Team win odds</SectLabel>
        <button className="linkbtn" style={{ margin: 0 }} onClick={() => setShowTeams(v => !v)}>{showTeams ? "Hide" : "Show"}</button>
      </div>
      {showTeams &&
        <div className="card" style={{ padding: "8px 8px" }}>
          {teamsByOdds.slice(0, 16).map((t, i) => (
            <div key={t.code} className="odds-row" style={i === 15 ? { borderBottom: "none" } : null}>
              <div className="mono odds-rk">{i + 1}</div>
              <div className="odds-crest"><Crest team={t} h={28} fs={13} /></div>
              <div className="odds-name">{t.name}</div>
              <div className="odds-bar"><Bar value={tp[t.code] / maxT} color={i === 0 ? "var(--gold)" : i < 4 ? "var(--pop)" : "var(--blue)"} /></div>
              <div className="display odds-pct">{fp2(tp[t.code])}</div>
              <div className="odds-owner"><Owner player={window.SS.ownerOf(state, t.code)} size={22} label={false} /></div>
            </div>
          ))}
          <div className="mono muted" style={{ fontSize: 11.5, padding: "10px 12px 4px", lineHeight: 1.5 }}>
            Seeded by FIFA ranking, nudged by every result. Knocked-out teams drop to 0% and their share spreads across the rest.
          </div>
        </div>}
    </div>
  );
}

/* ========================================================================== */
/*  TEAMS — the field, who owns who                                           */
/* ========================================================================== */
function Teams({ state, go }) {
  const [view, setView] = useState("odds");
  const [confed, setConfed] = useState("ALL");
  const [q, setQ] = useState("");
  const probs = useMemo(() => teamWinProbs(state), [state]);
  const ranks = useMemo(() => {
    const sorted = ALLT.filter(t => isAlive(state, t.code)).sort((a, b) => probs[b.code] - probs[a.code]);
    const r = {}; sorted.forEach((t, i) => r[t.code] = i + 1); return r;
  }, [state, probs]);
  const confeds = ["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];
  let list = ALLT.filter(t =>
    (confed === "ALL" || t.confed === confed) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.code.toLowerCase().includes(q.toLowerCase())));
  const aliveTot = ALLT.filter(t => isAlive(state, t.code)).length;

  function card(t) {
    const status = state.teams[t.code]?.status || "alive";
    return <Sticker key={t.code} team={t} prob={probs[t.code]} status={status}
      rank={status === "alive" ? ranks[t.code] : null} owner={state.draw.done ? window.SS.ownerOf(state, t.code) : null} />;
  }

  return (
    <div className="fadein">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 8 }}>
        <div>
          <div className="display" style={{ fontSize: "clamp(26px,5.5vw,34px)", textTransform: "uppercase" }}>The Field</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
            48 teams · <b>{aliveTot} still alive</b>{state.draw.done ? " · tap an owner to see who's got who" : " · odds set by FIFA ranking"}
          </div>
        </div>
        <div className="search-row">
          <input className="field" placeholder="Search team…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 170 }} />
          <div className="row" style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {["odds", "group"].map(v => (
              <button key={v} onClick={() => setView(v)} className="mono"
                style={{ border: "none", padding: "10px 16px", cursor: "pointer", fontSize: 12, textTransform: "uppercase",
                letterSpacing: ".08em", whiteSpace: "nowrap", background: view === v ? "var(--ink)" : "var(--card)", color: view === v ? "var(--paper)" : "var(--ink)" }}>
                {v === "odds" ? "By odds" : "By group"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="confed-row">
        {confeds.map(c => (
          <button key={c} onClick={() => setConfed(c)} className="mono"
            style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 11.5,
            letterSpacing: ".06em", textTransform: "uppercase", background: confed === c ? "var(--blue)" : "var(--card)",
            color: confed === c ? "#fff" : "var(--ink-soft)", borderColor: confed === c ? "var(--blue)" : "var(--line)" }}>
            {c === "ALL" ? "All" : c}
          </button>
        ))}
      </div>

      {view === "odds"
        ? <div className="sticker-grid">{[...list].sort((a, b) => probs[b.code] - probs[a.code]).map(card)}</div>
        : <div style={{ display: "grid", gap: 26 }}>
            {GL.map(g => {
              const gl = list.filter(t => t.group === g);
              if (!gl.length) return null;
              return <div key={g}><SectLabel>Group {g}</SectLabel>
                <div className="sticker-grid">{gl.sort((a, b) => probs[b.code] - probs[a.code]).map(card)}</div></div>;
            })}
          </div>}
    </div>
  );
}

/* ========================================================================== */
/*  ADMIN — host desk                                                         */
/* ========================================================================== */
function Admin({ state, update, go }) {
  const [adminDay, setAdminDay] = useState(state.currentDay);
  const [newName, setNewName] = useState("");
  const [picks, setPicks] = useState(() => ({ ...(state.draw.assignments || {}) }));
  const dayFx = fxDay(adminDay);
  const pickCounts = useMemo(() => {
    const c = {}; Object.values(picks).forEach(pid => { if (pid) c[pid] = (c[pid] || 0) + 1; }); return c;
  }, [picks]);
  const pickedTotal = Object.values(picks).filter(Boolean).length;

  function setScore(id, side, val) {
    update(s => {
      const cur = s.scores[id] || {};
      const next = { ...cur, [side]: val === "" ? "" : Math.max(0, +val) };
      if (next.hs === "" && next.as === "") delete s.scores[id];
      else s.scores[id] = { hs: next.hs === "" ? 0 : next.hs, as: next.as === "" ? 0 : next.as };
    });
  }
  function autofillDay() { update(s => { dayFx.forEach(f => s.scores[f.id] = mockScore(f)); }); }
  function clearDay() { update(s => { dayFx.forEach(f => delete s.scores[f.id]); }); }
  function toggle(code) {
    update(s => { const cur = s.teams[code].status; window.Store.setTeamStatus(s, code, cur === "alive" ? "out" : "alive"); });
  }

  function addOne() {
    const n = newName.trim(); if (!n) return;
    update(s => { window.Store.addPlayer(s, n); });
    setNewName("");
  }
  function removeOne(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    update(s => window.Store.removePlayer(s, id));
  }
  function seedNow() { update(s => window.Store.seedPlayers(s, 12)); }
  function clearAll() {
    if (!confirm("Remove all players and reset the draw? Pool name, pot, currency and host code are kept.")) return;
    update(s => window.Store.clearPlayers(s));
  }
  function setPick(code, pid) { setPicks(p => { const n = { ...p }; if (pid) n[code] = pid; else delete n[code]; return n; }); }
  function commitManual() {
    if (pickedTotal === 0) return;
    const msg = state.draw.done
      ? `Overwrite the current draw with these ${pickedTotal} assignment${pickedTotal === 1 ? "" : "s"}?`
      : `Commit this draw with ${pickedTotal} of 48 team${pickedTotal === 1 ? "" : "s"} assigned?`;
    if (!confirm(msg)) return;
    update(s => window.Store.commitManualDraw(s, picks));
  }

  return (
    <div className="fadein">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div className="display" style={{ fontSize: "clamp(26px,5.5vw,34px)", textTransform: "uppercase" }}>Host Desk</div>
          <div className="muted" style={{ fontSize: 14 }}>Run the draw, enter results, drive the tournament forward</div>
        </div>
        <div className="tag" style={{ background: "var(--lime)", padding: "6px 14px" }}>● Source: Manual entry</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }} className="admin-grid">
        {/* LEFT */}
        <div style={{ display: "grid", gap: 22 }}>
          {/* the draw */}
          <div className="panel" style={{ background: state.draw.done ? "var(--card)" : "var(--ink)", color: state.draw.done ? "var(--ink)" : "var(--paper)" }}>
            <div className="kept" style={{ color: state.draw.done ? "var(--ink-soft)" : "var(--lime)" }}>The draw</div>
            <div className="display" style={{ fontSize: 26, textTransform: "uppercase", margin: "8px 0 6px" }}>
              {state.draw.done ? "Complete ✓" : `${state.players.length} player${state.players.length !== 1 ? "s" : ""} ready`}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: state.draw.done ? "var(--ink-soft)" : "#D8CFBE" }}>
              {state.draw.done
                ? "Teams are dealt. Share your screen and re-run if you need to redo it."
                : "Share your screen, then run the animated draw — no one else needs access."}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <Btn kind="primary" onClick={() => go("draw")} disabled={state.players.length < 2}>
                {state.draw.done ? "Open the draw" : state.players.length < 2 ? "Need 2+ players" : "Open the draw"}
              </Btn>
            </div>
          </div>

          {/* players */}
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="kept">Players · {state.players.length}/{window.Store.MAX_PLAYERS}</div>
              <div className="mono muted" style={{ fontSize: 12 }}>
                {state.players.length >= window.Store.MAX_PLAYERS ? "pool full — sign-ups closed" : "seed, add or clear before the draw"}
              </div>
            </div>

            {state.players.length === 0
              ? <div className="mono muted" style={{ fontSize: 12.5, padding: "14px 0", textAlign: "center" }}>
                  No one in the pool yet — seed some test names, or share the sign-up link.
                </div>
              : <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {state.players.map(p => (
                    <div key={p.id} className="row" style={{ gap: 6, padding: "4px 4px 4px 4px",
                      border: "1px solid var(--line)", borderRadius: 999, background: "var(--card)" }}>
                      <Avatar player={p} size={22} />
                      <span className="mono" style={{ fontSize: 12.5, paddingLeft: 2 }}>{p.name}</span>
                      <button onClick={() => removeOne(p.id, p.name)} title={`Remove ${p.name}`}
                        style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16,
                          color: "var(--ink-soft)", padding: "0 6px", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>}

            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <input className="field" placeholder={state.players.length >= window.Store.MAX_PLAYERS ? "Pool is full" : "Add a player by name…"} value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addOne()}
                disabled={state.players.length >= window.Store.MAX_PLAYERS}
                style={{ flex: 1, minWidth: 0 }} />
              <Btn kind="blue" size="sm" onClick={addOne} disabled={!newName.trim() || state.players.length >= window.Store.MAX_PLAYERS}>Add</Btn>
            </div>

            <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <Btn kind="gold" size="sm" onClick={seedNow}>Seed 12 demo players</Btn>
              <Btn kind="ghost" size="sm" onClick={clearAll} disabled={state.players.length === 0}>Clear all players</Btn>
            </div>

            {state.draw.done &&
              <div className="mono muted" style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.5 }}>
                The draw is already done — adding or removing players won't re-deal teams. Use <b>Clear all</b> to reset and run the draw again.
              </div>}
          </div>

          {/* manual draw entry */}
          <div className="panel">
            <div className="kept">Enter draw manually</div>
            <div className="mono muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>
              Already ran the draw offline? Assign each team to its owner below — no animation needed.
              {state.draw.done && <> The current draw is loaded; change picks and save to overwrite.</>}
            </div>

            {state.players.length === 0
              ? <div className="mono muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.5, color: "var(--ink)" }}>
                  Add players above first — then come back to assign their teams.
                </div>
              : <>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {state.players.map(p => {
                      const n = pickCounts[p.id] || 0;
                      return (
                        <div key={p.id} className="row" style={{ gap: 6, padding: "4px 10px 4px 4px",
                          border: "1px solid var(--line)", borderRadius: 999, background: "var(--card)" }}>
                          <Avatar player={p} size={20} />
                          <span className="mono" style={{ fontSize: 12 }}>{p.name}</span>
                          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: n ? "var(--pop)" : "var(--ink-faint)" }}>{n}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                    {GL.map(g => {
                      const inGroup = ALLT.filter(t => t.group === g).sort((a, b) => b.fifa - a.fifa);
                      return (
                        <div key={g}>
                          <div className="mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--ink-soft)", marginBottom: 6 }}>GROUP {g}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6 }}>
                            {inGroup.map(t => (
                              <div key={t.code} className="row" style={{ gap: 8, padding: "5px 8px",
                                border: "1px solid var(--line)", borderRadius: 8, background: picks[t.code] ? "var(--paper-2)" : "var(--card)" }}>
                                <Crest team={t} h={18} fs={10} />
                                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, minWidth: 32 }}>{t.code}</span>
                                <select className="field" value={picks[t.code] || ""}
                                  onChange={e => setPick(t.code, e.target.value)}
                                  style={{ flex: 1, minWidth: 0, padding: "4px 6px", fontSize: 12 }}>
                                  <option value="">— pick —</option>
                                  {state.players.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn kind="primary" size="sm" onClick={commitManual} disabled={pickedTotal === 0}>
                      {state.draw.done ? "Save changes" : "Commit draw"}
                    </Btn>
                    <Btn kind="ghost" size="sm" onClick={() => setPicks({})} disabled={pickedTotal === 0}>Clear picks</Btn>
                    <div className="mono muted" style={{ fontSize: 11.5, marginLeft: "auto" }}>
                      {pickedTotal}/48 teams assigned
                    </div>
                  </div>
                </>}
          </div>

          {/* matchday control */}
          <div className="panel">
            <div className="kept">Matchday control</div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 12, gap: 12 }}>
              <Btn kind="ghost" size="sm" onClick={() => update(s => window.Store.advanceDay(s, -1))} disabled={state.currentDay <= 1}>← Back a day</Btn>
              <div style={{ textAlign: "center" }}>
                <div className="display" style={{ fontSize: 24 }}>Day {state.currentDay}</div>
                <div className="mono muted" style={{ fontSize: 11 }}>{fDate(state.currentDay)}</div>
              </div>
              <Btn kind="blue" size="sm" onClick={() => update(s => window.Store.advanceDay(s, 1))}>Advance day →</Btn>
            </div>
            <div className="mono muted" style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.5 }}>
              The current day drives what players see on Today (yesterday's results + today's fixtures).
            </div>
          </div>

          {/* who's still in */}
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="kept">Who's still in</div>
              <div className="mono muted" style={{ fontSize: 12 }}>tap to knock out / revive</div>
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(56px,1fr))", gap: 6 }}>
              {[...ALLT].sort((a, b) => b.fifa - a.fifa).map(t => {
                const out = !isAlive(state, t.code);
                return <button key={t.code} onClick={() => toggle(t.code)} title={t.name + (out ? " (out)" : "")}
                  className="mono" style={{ border: "2px solid var(--ink)", borderRadius: 8, padding: "7px 0", cursor: "pointer",
                  fontSize: 11, fontWeight: 500, background: out ? "var(--paper-3)" : t.colors[0],
                  color: out ? "var(--ink-faint)" : window.SS.textOn(t.colors[0]), textDecoration: out ? "line-through" : "none", opacity: out ? .7 : 1 }}>
                  {t.code}</button>;
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 22 }}>
          {/* enter results */}
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="kept">Enter results</div>
              <select className="field" value={adminDay} onChange={e => setAdminDay(+e.target.value)} style={{ width: 150, padding: "8px 12px" }}>
                {Array.from({ length: TDAYS }, (_, i) => i + 1).map(d =>
                  <option key={d} value={d}>Day {d} · {fDate(d)}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
              {dayFx.map(f => {
                const h = tByCode(f.home), a = tByCode(f.away);
                const sc = state.scores[f.id] || {};
                return (
                  <div key={f.id} className="row" style={{ gap: 8, padding: "5px 0" }}>
                    <span className="display" style={{ fontSize: 13, textTransform: "uppercase", flex: 1, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</span>
                    <input className="field score-in" type="number" min="0" value={sc.hs ?? ""} onChange={e => setScore(f.id, "hs", e.target.value)} />
                    <span className="mono" style={{ opacity: .5 }}>–</span>
                    <input className="field score-in" type="number" min="0" value={sc.as ?? ""} onChange={e => setScore(f.id, "as", e.target.value)} />
                    <span className="display" style={{ fontSize: 13, textTransform: "uppercase", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 14 }}>
              <Btn kind="lime" size="sm" onClick={autofillDay}>Auto-fill day</Btn>
              <Btn kind="ghost" size="sm" onClick={clearDay}>Clear day</Btn>
            </div>
          </div>

          {/* future api */}
          <div className="panel" style={{ background: "var(--ink)", color: "var(--paper)" }}>
            <div className="kept" style={{ color: "var(--lime)" }}>Results source</div>
            <div style={{ marginTop: 10, fontSize: 14, color: "#E2D9C7", lineHeight: 1.55 }}>
              Currently <b style={{ color: "#fff" }}>manual entry</b>. Results live in a clean fixtures schema (day · round · teams · score),
              so a live API feed can be wired in later without touching the rest of the app.
            </div>
            <Btn kind="ghost" disabled style={{ marginTop: 14 }}>Connect API feed — coming soon</Btn>
          </div>

          {/* pool settings */}
          <div className="panel">
            <div className="kept">Pool settings</div>
            <div className="pool-grid">
              <div><label className="lbl">Pool name</label>
                <input className="field" value={state.poolName} onChange={e => update(s => s.poolName = e.target.value)} /></div>
              <div><label className="lbl">Pot</label>
                <input className="field" type="number" value={state.pot} onChange={e => update(s => s.pot = +e.target.value || 0)} /></div>
              <div><label className="lbl">Cur.</label>
                <input className="field" value={state.currency} onChange={e => update(s => s.currency = e.target.value.slice(0, 2))} /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="lbl">Host access code</label>
              {state.mode === "remote"
                ? <div className="mono muted" style={{ fontSize: 12.5, lineHeight: 1.5, background: "var(--paper-2)",
                    border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                    Set by the <b style={{ color: "var(--ink)" }}>ADMIN_PASSWORD</b> environment variable in Netlify — change it there, not here.
                  </div>
                : <input className="field" value={state.adminPin || ""} onChange={e => update(s => s.adminPin = e.target.value)} style={{ maxWidth: 160 }} />}
            </div>
          </div>

          {/* danger */}
          <div className="panel" style={{ borderColor: "var(--pop)" }}>
            <div className="kept" style={{ color: "var(--pop)" }}>Danger zone</div>
            <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <Btn kind="gold" onClick={() => { update(s => Object.assign(s, window.Store.demoState())); go("today"); }}>Load demo pool</Btn>
              <Btn kind="ghost" onClick={() => { if (confirm("Reset everything to an empty sign-up?")) { update(s => Object.assign(s, window.Store.defaultState())); go("signup"); } }}>Reset pool</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Standings, Teams, Admin });
