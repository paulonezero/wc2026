/* ============================================================================
   SCREENS · 1 — Sign Up, Today, Draw
   ========================================================================== */
const { TEAMS: TM, GROUP_LETTERS, fixturesOnDay, fmtDate, dateForDay, fmtPct: pct,
        ownerOf, teamByCode, teamsOfPlayer, splitCounts, TOTAL_DAYS } = window.SS;

/* ========================================================================== */
/*  SIGN UP — the front door                                                  */
/* ========================================================================== */
function SignUp({ state, onJoin, onForget, go }) {
  const [name, setName] = useState("");
  const me = state.me ? state.players.find(p => p.id === state.me) : null;
  const counts = splitCounts(Math.max(1, state.players.length));
  const eachText = state.players.length ? `${Math.min(...counts)}–${Math.max(...counts)}` : "4";
  const days = Math.max(0, Math.round((dateForDay(1) - new Date("2026-06-10T00:00:00")) / 8.64e7));

  function join() {
    const n = name.trim(); if (!n) return;
    onJoin(n);
    setName("");
  }

  // already drawn → players just go to Today
  if (state.draw.done) {
    return (
      <div className="fadein center" style={{ minHeight: "60vh" }}>
        <div className="panel" style={{ maxWidth: 540, textAlign: "center", padding: "48px 40px" }}>
          <div className="kept">The draw has happened</div>
          <div className="display" style={{ fontSize: 40, textTransform: "uppercase", margin: "10px 0 8px" }}>
            We're under way
          </div>
          <div className="muted" style={{ fontSize: 16, lineHeight: 1.5 }}>
            {me ? `You're in as ${me.name}. ` : ""}Head to Today for the latest results and fixtures.
          </div>
          <div className="row" style={{ gap: 10, justifyContent: "center", marginTop: 22 }}>
            <Btn kind="primary" onClick={() => go("today")}>Go to Today →</Btn>
            <Btn kind="ghost" onClick={() => go("standings")}>Standings</Btn>
          </div>
        </div>
      </div>
    );
  }

  // signed up, waiting for the draw → confirmation
  if (me) {
    return (
      <div className="fadein center" style={{ minHeight: "62vh" }}>
        <div style={{ maxWidth: 560, width: "100%" }}>
          <div className="panel" style={{ textAlign: "center", padding: "44px 40px", position: "relative", overflow: "hidden" }}>
            <div className="center" style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--pop)",
              margin: "0 auto 18px", boxShadow: "var(--shadow-sm)" }}>
              <span className="display" style={{ fontSize: 36, color: "#fff" }}>✓</span>
            </div>
            <div className="kept">You're in the pool</div>
            <div className="display" style={{ fontSize: 42, textTransform: "uppercase", margin: "6px 0 10px" }}>
              See you, {me.name}
            </div>
            <div className="muted" style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 430, margin: "0 auto" }}>
              Sit tight. The host runs the draw on <b style={{ color: "var(--ink)" }}>{fmtDate(1)}</b>
              {days > 0 ? ` (${days} day${days > 1 ? "s" : ""} away)` : ""}. The 48 teams get split evenly
              between everyone who's in — pop back then to see which ones you land.
            </div>

            <div className="steps">
              {[["1","Name's down","You're locked into the pool"],
                ["2","Draw day","Host deals the teams out at random"],
                ["3","Check back","Your teams, daily results & the leaderboard"]].map(s => (
                <div key={s[0]} className="step">
                  <div className="step-n">{s[0]}</div>
                  <div className="display" style={{ fontSize: 15, textTransform: "uppercase", marginTop: 8 }}>{s[1]}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{s[2]}</div>
                </div>
              ))}
            </div>

            <button className="linkbtn" onClick={() => onForget()}>Not you? Sign up again</button>
          </div>

          <div style={{ marginTop: 20 }}>
            <SectLabel>In the pool · {state.players.length}</SectLabel>
            <div className="card" style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {state.players.map(p => <Owner key={p.id} player={p} you={p.id === state.me} size={26} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // fresh — the join form
  return (
    <div className="fadein">
      <div className="card" style={{ background: "var(--ink)", color: "var(--paper)", padding: "44px 44px 40px",
        position: "relative", overflow: "hidden", marginBottom: 24 }}>
        <div className="mono" style={{ color: "var(--lime)", fontSize: 12.5, letterSpacing: ".22em" }}>
          {state.poolName.toUpperCase()} · WORLD CUP 2026 · LAST TEAM STANDING
        </div>
        <div className="display" style={{ fontSize: "clamp(40px,6.5vw,76px)", textTransform: "uppercase", margin: "12px 0 10px" }}>
          Get your <span style={{ color: "var(--pop)" }}>name</span> down
        </div>
        <div style={{ color: "#D8CFBE", maxWidth: 540, lineHeight: 1.5, fontSize: 17 }}>
          One username, that's it — no passwords, no faff. You'll be dealt a handful of teams at the draw.
          Own the team that goes furthest and the {state.currency}{state.pot} pot is yours.
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 10, maxWidth: 480 }}>
          <input className="field" placeholder="Pick a username…" value={name}
                 style={{ background: "rgba(255,255,255,.07)", color: "#fff", borderColor: "rgba(255,255,255,.18)" }}
                 onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} />
          <Btn kind="primary" onClick={join} disabled={!name.trim()}>I'm in →</Btn>
        </div>
        <div className="mono" style={{ color: "#8A8170", fontSize: 12.5, marginTop: 12 }}>
          Draw day · {fmtDate(1)} · {state.players.length} signed up so far
        </div>
        <div style={{ position:"absolute", right:-40, top:-40, width:220, height:220, borderRadius:"50%",
          border:"1px solid rgba(255,255,255,.08)" }}></div>
        <div style={{ position:"absolute", right:10, top:10, width:150, height:150, borderRadius:"50%",
          border:"1px solid rgba(255,255,255,.06)" }}></div>
      </div>

      <SectLabel>Already in · {state.players.length}</SectLabel>
      {state.players.length === 0
        ? <div className="panel muted" style={{ textAlign: "center", padding: "30px" }}>
            Nobody yet — be the first to stick your name in.
          </div>
        : <div className="card" style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
            {state.players.map(p => <Owner key={p.id} player={p} size={28} />)}
          </div>}
    </div>
  );
}

/* ========================================================================== */
/*  TODAY — daily hub: yesterday's results + today's fixtures                 */
/* ========================================================================== */
function Today({ state, go }) {
  const [viewDay, setViewDay] = useState(state.currentDay);
  if (!state.draw.done) {
    const me = state.me ? state.players.find(p => p.id === state.me) : null;
    return <div className="fadein"><Empty title="The draw hasn't happened yet">
      {me ? <>You're in as <b>{me.name}</b>. </> : null}
      Teams get dealt out on <b>{fmtDate(1)}</b> — check back then for daily results and fixtures.
      <div style={{ marginTop: 18 }}><Btn kind="primary" onClick={() => go("signup")}>Back to sign-up</Btn></div>
    </Empty></div>;
  }

  const isLive = viewDay === state.currentDay;
  const todayFx = fixturesOnDay(viewDay);
  const yestFx = fixturesOnDay(viewDay - 1).filter(f => state.scores[f.id]);
  const meTeams = state.me ? new Set(teamsOfPlayer(state, state.me)) : new Set();
  const myTodayFx = state.me ? todayFx.filter(f => meTeams.has(f.home) || meTeams.has(f.away)) : [];

  function owners(code) {
    const o = ownerOf(state, code);
    return o ? <Owner player={o} size={20} you={o.id === state.me} /> : <span className="mono muted" style={{ fontSize: 11 }}>unowned</span>;
  }

  function ResultRow(f) {
    const sc = state.scores[f.id];
    const h = teamByCode(f.home), a = teamByCode(f.away);
    const hw = sc.hs > sc.as, aw = sc.as > sc.hs, draw = sc.hs === sc.as;
    const winner = hw ? h : aw ? a : null;
    const loser = hw ? a : aw ? h : null;
    const upset = winner && loser && winner.fifa < loser.fifa - 40;
    return (
      <div key={f.id} className="matchrow">
        <div className="mt-side" style={{ alignItems: "flex-end" }}>
          <MatchTeam team={h} align="right" strong={hw} dim={aw} />
          <div style={{ marginTop: 6 }}>{owners(f.home)}</div>
        </div>
        <div className="mt-mid">
          <div className="scorebox">{sc.hs}<span>–</span>{sc.as}</div>
          {upset ? <div className="upset">⚡ Upset</div> : <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{draw ? "Draw" : "FT"}</div>}
        </div>
        <div className="mt-side">
          <MatchTeam team={a} align="left" strong={aw} dim={hw} />
          <div style={{ marginTop: 6 }}>{owners(f.away)}</div>
        </div>
      </div>
    );
  }
  function FixtureRow(f) {
    const sc = state.scores[f.id];
    const h = teamByCode(f.home), a = teamByCode(f.away);
    return (
      <div key={f.id} className="matchrow">
        <div className="mt-side" style={{ alignItems: "flex-end" }}>
          <MatchTeam team={h} align="right" />
          <div style={{ marginTop: 6 }}>{owners(f.home)}</div>
        </div>
        <div className="mt-mid">
          {sc ? <div className="scorebox live">{sc.hs}<span>–</span>{sc.as}</div>
              : <div className="kotime">{f.ko}</div>}
          <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{sc ? "Live/FT" : "Group " + f.group}</div>
        </div>
        <div className="mt-side">
          <MatchTeam team={a} align="left" />
          <div style={{ marginTop: 6 }}>{owners(f.away)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fadein">
      {/* day header */}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div className="row" style={{ gap: 10 }}>
            <div className="display" style={{ fontSize: 34, textTransform: "uppercase" }}>
              {isLive ? "Today" : "Matchday " + viewDay}
            </div>
            {isLive && <span className="tag" style={{ background: "var(--pop)", color: "#fff", borderColor: "var(--ink)" }}>Live</span>}
          </div>
          <div className="muted" style={{ fontSize: 14 }}>Matchday {viewDay} · {fmtDate(viewDay)} · group stage</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn kind="ghost" size="sm" onClick={() => setViewDay(d => Math.max(1, d - 1))} disabled={viewDay <= 1}>← Prev day</Btn>
          {!isLive && <Btn kind="ink" size="sm" onClick={() => setViewDay(state.currentDay)}>Jump to today</Btn>}
          <Btn kind="ghost" size="sm" onClick={() => setViewDay(d => Math.min(TOTAL_DAYS, d + 1))} disabled={viewDay >= TOTAL_DAYS}>Next day →</Btn>
        </div>
      </div>

      {/* your teams today */}
      {state.me && myTodayFx.length > 0 &&
        <div className="card" style={{ background: "var(--gold)", padding: "14px 18px", marginBottom: 22,
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span className="display" style={{ fontSize: 16, textTransform: "uppercase" }}>Your teams out today</span>
          <div className="teamchips">
            {myTodayFx.flatMap(f => [f.home, f.away]).filter(c => meTeams.has(c))
              .map(c => <TeamChip key={c} team={teamByCode(c)} />)}
          </div>
        </div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }} className="today-grid">
        {/* yesterday */}
        <div>
          <SectLabel>{isLive ? "Yesterday's results" : "Day " + (viewDay - 1) + " results"} · {viewDay > 1 ? fmtDate(viewDay - 1) : "—"}</SectLabel>
          {yestFx.length === 0
            ? <div className="panel muted" style={{ textAlign: "center", padding: 28 }}>No results to show for the day before.</div>
            : <div className="card" style={{ padding: 6 }}>{yestFx.map(ResultRow)}</div>}
        </div>
        {/* today */}
        <div>
          <SectLabel>{isLive ? "Today's fixtures" : "Day " + viewDay + " fixtures"} · {fmtDate(viewDay)}</SectLabel>
          {todayFx.length === 0
            ? <div className="panel muted" style={{ textAlign: "center", padding: 28 }}>No matches scheduled.</div>
            : <div className="card" style={{ padding: 6 }}>{todayFx.map(FixtureRow)}</div>}
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <Btn kind="lime" onClick={() => go("standings")}>See the standings →</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  THE DRAW — admin-run animated reveal (screen-shared)                      */
/* ========================================================================== */
function Draw({ state, update, go }) {
  const ready = state.players.length >= 2;
  const [phase, setPhase] = useState(state.draw.done ? "done" : "idle");
  const [order, setOrder] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [auto, setAuto] = useState(true);
  const [piles, setPiles] = useState({});
  const stash = useRef(null);

  useEffect(() => {
    if (state.draw.done) {
      const p = {}; state.players.forEach(pl => p[pl.id] = []);
      state.draw.order.forEach(o => { (p[o.playerId] = p[o.playerId] || []).push(o.code); });
      setPiles(p); setPhase("done"); setIdx(state.draw.order.length);
    }
  }, []);

  function start() {
    const { assignments, order: ord } = window.Store.computeDraw(state);
    setOrder(ord);
    const p = {}; state.players.forEach(pl => p[pl.id] = []);
    setPiles(p); setIdx(-1); setPhase("running"); setAuto(true);
    stash.current = { assignments, order: ord };
  }
  function step() {
    setIdx(i => {
      const ni = i + 1; if (ni >= order.length) return i;
      const o = order[ni];
      setPiles(pl => ({ ...pl, [o.playerId]: [...(pl[o.playerId] || []), o.code] }));
      return ni;
    });
  }
  useEffect(() => {
    if (phase !== "running" || !auto) return;
    if (idx >= order.length - 1) { const t = setTimeout(finish, 700); return () => clearTimeout(t); }
    const t = setTimeout(step, idx < 0 ? 400 : 520);
    return () => clearTimeout(t);
  }, [phase, auto, idx, order]);

  function finish() {
    update(s => { s.draw = { done: true, assignments: stash.current.assignments, order: stash.current.order }; s.phase = "drawn"; });
    setPhase("done"); fireConfetti(70);
  }
  function skip() {
    setAuto(false); setIdx(order.length - 1);
    const p = {}; state.players.forEach(pl => p[pl.id] = []);
    order.forEach(o => p[o.playerId].push(o.code)); setPiles(p); setTimeout(finish, 150);
  }

  const current = idx >= 0 && idx < order.length ? order[idx] : null;
  const curTeam = current ? teamByCode(current.code) : null;
  const curPlayer = current ? state.players.find(p => p.id === current.playerId) : null;
  const progress = order.length ? (idx + 1) / order.length : 0;

  if (!ready && !state.draw.done)
    return <div className="fadein"><Empty title="Not enough players yet">
      You need at least 2 people signed up before the draw. Add them from Admin, or share the sign-up link.
      <div style={{ marginTop: 18 }}><Btn kind="primary" onClick={() => go("admin")}>Back to Admin</Btn></div>
    </Empty></div>;

  return (
    <div className="fadein">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div className="display" style={{ fontSize: 34, textTransform: "uppercase" }}>The Draw</div>
          <div className="muted" style={{ fontSize: 14 }}>48 teams · {state.players.length} players · dealt at random, one at a time</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {phase === "idle" && <Btn kind="primary" size="lg" onClick={start}>Run the draw</Btn>}
          {phase === "running" && <>
            <Btn kind="ghost" onClick={() => setAuto(a => !a)}>{auto ? "Pause" : "Play"}</Btn>
            {!auto && <Btn kind="blue" onClick={step} disabled={idx >= order.length - 1}>Reveal next →</Btn>}
            <Btn kind="ghost" onClick={skip}>Skip</Btn>
          </>}
          {phase === "done" && <Btn kind="lime" onClick={() => go("today")}>Done → Today</Btn>}
        </div>
      </div>

      {phase !== "done" &&
        <div className="card center" style={{ height: 290, marginBottom: 20, position: "relative", overflow: "hidden", background: "var(--ink)" }}>
          <div className="stage-dots"></div>
          {phase === "idle" &&
            <div style={{ textAlign: "center", color: "var(--paper)", zIndex: 2 }}>
              <div className="display" style={{ fontSize: 42, textTransform: "uppercase" }}>Ready when you are</div>
              <div style={{ color: "#C9C0AE", marginTop: 6 }}>Share your screen and hit “Run the draw”.</div>
            </div>}
          {phase === "running" && curTeam &&
            <div key={idx} className="reveal-pop" style={{ textAlign: "center", zIndex: 2 }}>
              <div style={{ width: 168, margin: "0 auto" }}><Sticker team={curTeam} hover={false} /></div>
              <div className="mono" style={{ color: "var(--lime)", marginTop: 12, fontSize: 13, letterSpacing: ".14em" }}>→ DEALT TO</div>
              <div className="row center" style={{ gap: 9, marginTop: 6 }}>
                <Avatar player={curPlayer} size={30} />
                <span className="display" style={{ color: "var(--paper)", fontSize: 26, textTransform: "uppercase" }}>{curPlayer.name}</span>
              </div>
            </div>}
          {phase === "running" &&
            <div style={{ position: "absolute", bottom: 14, left: 24, right: 24, zIndex: 2 }}>
              <div className="bar" style={{ background: "rgba(255,255,255,.12)" }}>
                <i style={{ width: progress * 100 + "%", background: "var(--lime)" }}></i>
              </div>
              <div className="mono" style={{ color: "#C9C0AE", fontSize: 11, marginTop: 6, textAlign: "right" }}>{idx + 1} / {order.length} teams dealt</div>
            </div>}
        </div>}

      <div className="pile-grid">
        {state.players.map(p => {
          const mine = piles[p.id] || [];
          return (
            <div key={p.id} className="panel" style={{ padding: 14 }}>
              <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                <Avatar player={p} size={32} />
                <div style={{ flex: 1 }}>
                  <div className="display" style={{ fontSize: 16, textTransform: "uppercase", lineHeight: 1 }}>{p.name}</div>
                  <div className="mono muted" style={{ fontSize: 11 }}>{mine.length} team{mine.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <div className="teamchips">
                {mine.map(c => <TeamChip key={c} team={teamByCode(c)} code />)}
                {mine.length === 0 && <span className="mono muted" style={{ fontSize: 11 }}>waiting…</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { SignUp, Today, Draw });
