/* ============================================================================
   SCREENS · 1 — Sign Up, Today, Draw
   ========================================================================== */
const { TEAMS: TM, GROUP_LETTERS, fixturesOnDay, fmtDate, fmtKo, dateForDay, liveDay, fmtPct: pct,
        ownerOf, teamByCode, teamsOfPlayer, splitCounts, TOTAL_DAYS,
        tierLabel, tierSubtitle } = window.SS;

/* ========================================================================== */
/*  CHEAT MODAL — the joke overlay for the "Donate to Paul's Revolut" button  */
/* ========================================================================== */
function CheatModal({ onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,27,35,.62)",
      zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="panel fadein"
           style={{ maxWidth: 440, width: "100%", textAlign: "center", padding: "36px 32px" }}>
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 6, letterSpacing: 8 }}>
          <span className="siren-pulse">🚨</span>
          <span className="siren-pulse" style={{ animationDelay: ".25s" }}>🚨</span>
          <span className="siren-pulse" style={{ animationDelay: ".5s" }}>🚨</span>
        </div>
        <div className="kept" style={{ color: "var(--red)" }}>
          <span style={{ marginRight: 6, verticalAlign: "-1px" }}>🥷</span>Busted
        </div>
        <div className="display" style={{ fontSize: 40, textTransform: "uppercase", margin: "8px 0 10px" }}>Nice try.</div>
        <div className="muted" style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 340, margin: "0 auto" }}>
          Cheating attempt logged :)
        </div>
        <div className="row" style={{ justifyContent: "center", marginTop: 22 }}>
          <Btn kind="ink" onClick={onClose}>Fair enough →</Btn>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  SIGN UP — the front door                                                  */
/* ========================================================================== */
function SignUp({ state, onJoin, onForget, go }) {
  const [name, setName] = useState("");
  const [gotcha, setGotcha] = useState(false);
  const me = state.me ? state.players.find(p => p.id === state.me) : null;
  const counts = splitCounts(Math.max(1, state.players.length));
  const eachText = state.players.length ? `${Math.min(...counts)}–${Math.max(...counts)}` : "4";
  const days = Math.max(0, Math.round((dateForDay(1) - new Date("2026-06-10T00:00:00")) / 8.64e7));
  const cap = window.Store.MAX_PLAYERS;
  const full = state.players.length >= cap;

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
      <div className="card hero" style={{ background: "var(--ink)", color: "var(--paper)",
        position: "relative", overflow: "hidden", marginBottom: 24 }}>
        <div className="mono" style={{ color: "var(--lime)", fontSize: 12.5, letterSpacing: ".22em" }}>
          {state.poolName.toUpperCase()} · WORLD CUP 2026 · LAST TEAM STANDING
        </div>
        <div className="display" style={{ fontSize: "clamp(32px,6.5vw,76px)", textTransform: "uppercase", margin: "12px 0 10px" }}>
          Get your <span style={{ color: "var(--pop)" }}>name</span> down
        </div>
        <div style={{ color: "#D8CFBE", maxWidth: 540, lineHeight: 1.5, fontSize: 17 }}>
          One username, that's it — no passwords, no faff. You'll be dealt a handful of teams at the draw.
          Own the team that goes furthest and the {state.currency}{state.pot || "?"} pot is yours.
        </div>
        {full
          ? <div style={{ marginTop: 24, maxWidth: 480, padding: "18px 20px", borderRadius: 12,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.18)" }}>
              <div className="display" style={{ fontSize: 22, textTransform: "uppercase", color: "var(--pop)" }}>
                Sign-ups closed
              </div>
              <div style={{ color: "#D8CFBE", marginTop: 6, fontSize: 14.5, lineHeight: 1.5 }}>
                Pool is full at {cap}/{cap}. The draw kicks off on <b style={{ color: "#fff" }}>{fmtDate(1)}</b> — check back then for results.
              </div>
            </div>
          : <>
              <div style={{ marginTop: 24, display: "flex", gap: 10, maxWidth: 480 }}>
                <input className="field" placeholder="Pick a username…" value={name}
                       style={{ background: "rgba(255,255,255,.07)", color: "#fff", borderColor: "rgba(255,255,255,.18)" }}
                       onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} />
                <Btn kind="primary" onClick={join} disabled={!name.trim()}>I'm in →</Btn>
              </div>
              <div style={{ marginTop: 14 }}>
                <Btn kind="gold" size="sm" onClick={() => { window.Net.bumpDonate(name.trim()); setGotcha(true); }} disabled={!name.trim()}
                     style={{ whiteSpace: "normal", textAlign: "left", lineHeight: 1.25, maxWidth: 480 }}>
                  <span style={{ marginRight: 8, fontSize: "1.1em", verticalAlign: "-1px" }}>🥷</span>
                  Psst… donate to Paul's Revolut for a better set of teams
                </Btn>
              </div>
            </>}
        <div className="mono" style={{ color: "#8A8170", fontSize: 12.5, marginTop: 12 }}>
          Draw day · {fmtDate(1)} · {state.players.length}/{cap} signed up so far
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

      {gotcha && <CheatModal onClose={() => { setGotcha(false); join(); }} />}
    </div>
  );
}

/* ========================================================================== */
/*  DAILY SNIPPET — fun morning write-up generated by Netlify cron at 08:00 UK */
/* ========================================================================== */
function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms)) return "";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
// Bold every occurrence of a player name in `text`. Names are matched at
// word boundaries (case-insensitive), longest-first so "Cian" doesn't pre-empt
// "Cianan". Regex special chars in names are escaped so e.g. "O'Brien" doesn't
// blow up the pattern.
function highlightNames(text, names) {
  if (!names?.length) return text;
  const sorted = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(${sorted.map(esc).join("|")})\\b`, "gi");
  const parts = String(text).split(re);
  return parts.map((p, i) => i % 2 === 1
    ? <strong key={i} style={{ fontWeight: 700 }}>{p}</strong>
    : p);
}
function DailySnippet({ snippet, players }) {
  if (!snippet || !snippet.body) return null;
  const paragraphs = String(snippet.body).split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const names = (players || []).map(p => p.name);
  return (
    <div className="card" style={{ padding: "18px 22px", marginBottom: 22, background: "var(--card)",
      borderLeft: "4px solid var(--gold)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div className="kept" style={{ color: "var(--ink-soft)" }}>Morning snippet</div>
        <div className="mono muted" style={{ fontSize: 11 }}>
          {timeAgo(snippet.generatedAt)}{snippet.source === "manual" ? " · manual" : ""}
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>{highlightNames(p, names)}</p>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  TODAY — daily hub: yesterday's results + today's fixtures                 */
/* ========================================================================== */
function Today({ state, go }) {
  const today = liveDay();
  const [viewDay, setViewDay] = useState(today);
  if (!state.draw.done) {
    const me = state.me ? state.players.find(p => p.id === state.me) : null;
    return <div className="fadein"><Empty title="The draw hasn't happened yet">
      {me ? <>You're in as <b>{me.name}</b>. </> : null}
      Teams get dealt out on <b>{fmtDate(1)}</b> — check back then for daily results and fixtures.
      <div style={{ marginTop: 18 }}><Btn kind="primary" onClick={() => go("signup")}>Back to sign-up</Btn></div>
    </Empty></div>;
  }

  const isLive = viewDay === today;
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
              : <div className="kotime">{fmtKo(f)}</div>}
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
            <div className="display" style={{ fontSize: "clamp(26px,5.5vw,34px)", textTransform: "uppercase" }}>
              {isLive ? "Today" : "Matchday " + viewDay}
            </div>
            {isLive && <span className="tag" style={{ background: "var(--pop)", color: "#fff", borderColor: "var(--ink)" }}>Live</span>}
          </div>
          <div className="muted" style={{ fontSize: 14 }}>Matchday {viewDay} · {fmtDate(viewDay)} · group stage</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn kind="ghost" size="sm" onClick={() => setViewDay(d => Math.max(1, d - 1))} disabled={viewDay <= 1}>← Prev day</Btn>
          {!isLive && <Btn kind="ink" size="sm" onClick={() => setViewDay(today)}>Jump to today</Btn>}
          <Btn kind="ghost" size="sm" onClick={() => setViewDay(d => Math.min(TOTAL_DAYS, d + 1))} disabled={viewDay >= TOTAL_DAYS}>Next day →</Btn>
        </div>
      </div>

      {/* morning snippet (cron- or admin-generated) */}
      {isLive && <DailySnippet snippet={state.snippet} players={state.players} />}

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
const DRAW_SPEEDS = [
  { key: "relaxed", label: "Relaxed", mult: 2.1 },
  { key: "normal",  label: "Normal",  mult: 1.0 },
  { key: "quick",   label: "Quick",   mult: 0.62 },
];
// base stage durations (ms): tier announce -> pull team from pot -> reveal team -> spin names -> land
const STAGE_MS = { intro: 700, "tier-intro": 1900, pull: 1100, team: 1400, spin: 1500, land: 1150 };
// tongue-in-cheek "system" messages shown while the names spin
const DRAW_QUIPS = [
  "Accounting for Revolut donations…",
  "Making sure Engineering get a good outcome…",
  "Applying the office-politics modifier…",
  "Running the results through Data Bridge…",
  "Pretending this isn't rigged…",
  "Pretending Ireland qualified…",
];

function Draw({ state, update, go }) {
  const ready = state.players.length >= 2;
  const [phase, setPhase] = useState(state.draw.done ? "done" : "idle");
  const [order, setOrder] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [sub, setSub] = useState("pull");        // tier-intro | pull | team | spin | land
  const [auto, setAuto] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [reel, setReel] = useState(null);         // player cycled during name spin
  const [quip, setQuip] = useState("");           // jokey message during the spin
  const [piles, setPiles] = useState({});
  const stash = useRef(null);
  const tRef = useRef(null);
  const reelRef = useRef(null);

  // tier preview for the idle phase (recomputes if player count changes)
  const preview = useMemo(() => ready ? window.Store.computeTiers(state) : null,
                          [ready, state.players.length]);

  useEffect(() => {
    if (state.draw.done) {
      const p = {}; state.players.forEach(pl => p[pl.id] = []);
      state.draw.order.forEach(o => { (p[o.playerId] = p[o.playerId] || []).push(o.code); });
      setPiles(p); setPhase("done"); setIdx(state.draw.order.length);
    }
    return () => { clearTimeout(tRef.current); clearInterval(reelRef.current); };
  }, []);

  const dur = (k) => STAGE_MS[k] * speed;

  function start() {
    const { assignments, order: ord } = window.Store.computeDraw(state);
    setOrder(ord);
    const p = {}; state.players.forEach(pl => p[pl.id] = []);
    setPiles(p); setIdx(-1); setSub("pull"); setReel(null); setPhase("running"); setAuto(true);
    stash.current = { assignments, order: ord };
  }

  function commitPile(pick) {
    setPiles(pl => ({ ...pl, [pick.playerId]: [...(pl[pick.playerId] || []), pick.code] }));
  }

  // advance exactly one stage — used by both the auto-timer and the manual button
  function advance() {
    if (idx < 0) { setIdx(0); setSub("tier-intro"); return; }
    const pick = order[idx];
    if (sub === "tier-intro") setSub("pull");
    else if (sub === "pull") setSub("team");
    else if (sub === "team") { setQuip(DRAW_QUIPS[Math.floor(Math.random() * DRAW_QUIPS.length)]); setSub("spin"); }
    else if (sub === "spin") { commitPile(pick); setReel(state.players.find(p => p.id === pick.playerId)); setSub("land"); }
    else if (sub === "land") {
      if (idx >= order.length - 1) finish();
      else {
        const next = order[idx + 1];
        setIdx(idx + 1);
        setSub(next.tier !== pick.tier ? "tier-intro" : "pull");
      }
    }
  }

  // auto stage machine
  useEffect(() => {
    if (phase !== "running" || !auto) return;
    clearTimeout(tRef.current);
    const k = idx < 0 ? "intro" : sub;
    tRef.current = setTimeout(advance, dur(k));
    return () => clearTimeout(tRef.current);
  }, [phase, auto, idx, sub, order, speed]);

  // name slot-machine cycling during the spin beat
  useEffect(() => {
    clearInterval(reelRef.current);
    if (phase === "running" && sub === "spin" && idx >= 0) {
      reelRef.current = setInterval(() => {
        const ps = state.players;
        setReel(ps[Math.floor(Math.random() * ps.length)]);
      }, 75);
      return () => clearInterval(reelRef.current);
    }
  }, [phase, sub, idx]);

  function finish() {
    clearTimeout(tRef.current); clearInterval(reelRef.current);
    update(s => { s.draw = { done: true, assignments: stash.current.assignments, order: stash.current.order }; s.phase = "drawn"; });
    setPhase("done"); fireConfetti(110);
  }
  function skip() {
    clearTimeout(tRef.current); clearInterval(reelRef.current);
    setAuto(false);
    const p = {}; state.players.forEach(pl => p[pl.id] = []);
    order.forEach(o => p[o.playerId].push(o.code)); setPiles(p);
    setIdx(order.length); setTimeout(finish, 150);
  }

  const pick = idx >= 0 && idx < order.length ? order[idx] : null;
  const curTeam = pick ? teamByCode(pick.code) : null;
  const curPlayer = pick ? state.players.find(p => p.id === pick.playerId) : null;
  const done = idx >= 0 ? idx + (sub === "land" ? 1 : 0) : 0;
  const progress = order.length ? done / order.length : 0;
  // teams still "in the pot" — current team leaves the pot the moment it's pulled
  const consumed = idx < 0 ? 0 : (sub === "tier-intro" || sub === "pull" ? idx : idx + 1);

  // current-tier remaining: which teams in this tier are still to come, who still needs one
  const tier = pick?.tier || 0;
  const tierTotal = pick?.tierTotal || 0;
  const tierEntries = tier ? order.filter(o => o.tier === tier) : [];
  const receivedThisTier = tier
    ? order.slice(0, idx + (sub === "land" ? 1 : 0)).filter(o => o.tier === tier)
    : [];
  const receivedIds = new Set(receivedThisTier.map(o => o.playerId));
  const tierPotCodes = tier
    ? order.slice(consumed).filter(o => o.tier === tier).map(o => o.code)
    : order.slice(consumed).map(o => o.code);

  if (!ready && !state.draw.done)
    return <div className="fadein"><Empty title="Not enough players yet">
      You need at least 2 people signed up before the draw. Add them from Admin, or share the sign-up link.
      <div style={{ marginTop: 18 }}><Btn kind="primary" onClick={() => go("admin")}>Back to Admin</Btn></div>
    </Empty></div>;

  const beatLabel = idx < 0 ? "Shuffling the pot…"
    : sub === "tier-intro" ? "Up next…"
    : sub === "pull" ? "Reaching into the pot…"
    : sub === "team" ? "Out comes…"
    : sub === "spin" ? "And it goes to…"
    : "Drawn!";

  return (
    <div className="fadein">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div className="display" style={{ fontSize: 34, textTransform: "uppercase" }}>The Draw</div>
          <div className="muted" style={{ fontSize: 14 }}>
            {order.length || 48} teams · {state.players.length} players
            {preview ? ` · ${preview.numTiers} tier${preview.numTiers !== 1 ? "s" : ""} by FIFA rank, bottom-up` : ""}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {phase === "idle" && <>
            <div className="seg">
              {DRAW_SPEEDS.map(s => (
                <button key={s.key} className={"seg-b" + (speed === s.mult ? " on" : "")} onClick={() => setSpeed(s.mult)}>{s.label}</button>
              ))}
            </div>
            <Btn kind="primary" size="lg" onClick={start}>Run the draw</Btn>
          </>}
          {phase === "running" && <>
            <div className="seg">
              {DRAW_SPEEDS.map(s => (
                <button key={s.key} className={"seg-b" + (speed === s.mult ? " on" : "")} onClick={() => setSpeed(s.mult)}>{s.label}</button>
              ))}
            </div>
            <Btn kind="ghost" onClick={() => setAuto(a => !a)}>{auto ? "Pause" : "Play"}</Btn>
            {!auto && <Btn kind="blue" onClick={advance}>Next →</Btn>}
            <Btn kind="ghost" onClick={skip}>Skip all</Btn>
          </>}
          {phase === "done" && <Btn kind="lime" onClick={() => go("today")}>Done → Today</Btn>}
        </div>
      </div>

      {phase !== "done" &&
        <div className="card drawstage" style={{ marginBottom: 20 }}>
          <div className="stage-dots"></div>

          {phase === "idle" &&
            <div className="stage-inner" style={{ zIndex: 2, position: "relative", color: "var(--paper)" }}>
              <div className="pot-emoji">⚽</div>
              <div className="display" style={{ fontSize: 36, textTransform: "uppercase", textAlign: "center" }}>Ready when you are</div>
              <div style={{ color: "#C9C0AE", marginTop: 4, textAlign: "center", maxWidth: 480 }}>
                Teams are sorted by FIFA ranking into {preview?.numTiers || 0} tiers.
                Draw starts at the <b style={{ color: "#fff" }}>bottom</b> — every player picks one — and works up to the <b style={{ color: "var(--gold)" }}>top tier</b> last.
              </div>

              {/* tier preview: top at top, bottom at bottom, so the visual maps to "best on top" */}
              {preview && preview.tiers.length > 0 &&
                <div className="tier-preview">
                  {preview.tiers.slice().reverse().map((codes, revIdx) => {
                    const tnum = preview.tiers.length - revIdx;
                    const isTop = tnum === preview.numTiers;
                    const isBot = tnum === 1;
                    const cls = "tier-preview-row" + (isTop ? " top" : "") + (isBot ? " bottom" : "");
                    const subt = tierSubtitle(tnum, preview.numTiers);
                    return (
                      <div key={tnum} className={cls}>
                        <div className="tier-preview-label">
                          {tierLabel(tnum, preview.numTiers)}
                          <span className="small">Tier {tnum} of {preview.numTiers}{subt ? " · " + subt : ""}</span>
                        </div>
                        <div className="tier-preview-flags">
                          {codes.map(c => (
                            <span key={c} className="drum-flag" title={teamByCode(c).name}>
                              <img src={window.SS.flagURL(teamByCode(c), 40)} alt={teamByCode(c).name} />
                            </span>
                          ))}
                        </div>
                        <div className="tier-preview-count">{codes.length} team{codes.length !== 1 ? "s" : ""}</div>
                      </div>
                    );
                  })}
                </div>}
            </div>}

          {phase === "running" &&
            <div className="stage-inner" style={{ zIndex: 2, position: "relative" }}>
              <div className="mono beat-label">{beatLabel}</div>

              {/* tier banner — visible from idx 0 onwards */}
              {tier > 0 &&
                <div className={"tier-banner" + (tier === tierTotal ? " top" : "") + (tier === 1 ? " bottom" : "")}>
                  <span className="tier-tag">{tierLabel(tier, tierTotal)}</span>
                  <span className="tier-num">Tier {tier} of {tierTotal}</span>
                </div>}

              {/* tier intro splash — flags of the about-to-be-drawn tier */}
              {sub === "tier-intro" && tier > 0 &&
                <div className="tier-intro fadein">
                  <div className="display tier-intro-title">{tierLabel(tier, tierTotal).toUpperCase()}</div>
                  {tierSubtitle(tier, tierTotal) &&
                    <div className="mono tier-intro-sub">{tierSubtitle(tier, tierTotal)}</div>}
                  <div className="tier-intro-flags">
                    {tierEntries.map(o => (
                      <span key={o.code} className="drum-flag" title={teamByCode(o.code).name}>
                        <img src={window.SS.flagURL(teamByCode(o.code), 40)} alt="" />
                      </span>
                    ))}
                  </div>
                  <div className="mono tier-intro-meta">{tierEntries.length} team{tierEntries.length !== 1 ? "s" : ""} · one for each player</div>
                </div>}

              {/* the pot of remaining flags in THIS tier */}
              {sub !== "tier-intro" && (idx < 0 || sub === "pull") &&
                <div className={"drum" + (sub === "pull" || idx < 0 ? " shake" : "")}>
                  {tierPotCodes.slice(0, 24).map(c => (
                    <span key={c} className="drum-flag"><img src={window.SS.flagURL(teamByCode(c), 40)} alt="" /></span>
                  ))}
                  <div className="drum-count">
                    {idx < 0
                      ? `${order.length} teams · ${tierTotal || preview?.numTiers || 0} tiers`
                      : `${tierPotCodes.length} left in this tier`}
                  </div>
                </div>}

              {/* the team that came out */}
              {curTeam && (sub === "team" || sub === "spin" || sub === "land") &&
                <div className={"draw-team" + (sub === "team" ? " big reveal-pop" : "")}>
                  <div style={{ width: sub === "team" ? 188 : 132, transition: "width .4s ease", margin: "0 auto" }}>
                    <Sticker team={curTeam} hover={false} />
                  </div>
                </div>}

              {/* the name spin / landing */}
              {(sub === "spin" || sub === "land") &&
                <div className="namebox">
                  <div key={sub === "land" ? "land" : quip} className="mono draw-quip" style={{ color: sub === "land" ? "var(--lime)" : "#C9C0AE", fontSize: 12, letterSpacing: ".1em", marginBottom: 6 }}>
                    {sub === "land" ? "WINS THE STICKER" : quip}
                  </div>
                  <div className={"name-reel" + (sub === "land" ? " land" : " spin")}>
                    <Avatar player={sub === "land" ? curPlayer : reel} size={sub === "land" ? 40 : 32} />
                    <span className="display" style={{ color: "#fff", fontSize: sub === "land" ? 34 : 26, textTransform: "uppercase" }}>
                      {(sub === "land" ? curPlayer : reel)?.name || "…"}
                    </span>
                  </div>
                </div>}

              {/* players still to receive in this tier */}
              {tier > 0 && sub !== "tier-intro" &&
                <div className="tier-players">
                  <div className="mono tier-players-label">
                    {tierEntries.length - receivedThisTier.length} of {tierEntries.length} player{tierEntries.length !== 1 ? "s" : ""} still to draw this tier
                  </div>
                  <div className="tier-players-row">
                    {tierEntries
                      .map(o => ({ o, p: state.players.find(pl => pl.id === o.playerId) }))
                      .sort((a, b) => (a.p?.name || "").localeCompare(b.p?.name || ""))
                      .map(({ o, p }) => {
                      const got = receivedIds.has(o.playerId);
                      const isCurrent = pick && pick.playerId === o.playerId
                        && sub === "land";
                      return (
                        <div key={o.code} className={"tier-player" + (got ? " got" : "") + (isCurrent ? " on" : "")} title={p?.name}>
                          <Avatar player={p} size={26} />
                        </div>
                      );
                    })}
                  </div>
                </div>}

              {/* progress */}
              <div className="draw-progress">
                <div className="bar" style={{ background: "rgba(255,255,255,.12)" }}>
                  <i style={{ width: progress * 100 + "%", background: "var(--lime)" }}></i>
                </div>
                <div className="mono" style={{ color: "#C9C0AE", fontSize: 11, marginTop: 6, textAlign: "right" }}>{done} / {order.length} teams drawn</div>
              </div>
            </div>}
        </div>}

      <div className="pile-grid">
        {state.players.map(p => {
          const mine = piles[p.id] || [];
          const justGot = phase === "running" && sub === "land" && pick && pick.playerId === p.id;
          return (
            <div key={p.id} className={"panel" + (justGot ? " pile-hit" : "")} style={{ padding: 14 }}>
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
