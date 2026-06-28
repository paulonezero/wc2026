/* ============================================================================
   SCREENS · 3 — Stats (tournament numbers + sweepstake blend)
   ========================================================================== */
// Aliased to avoid clashing with top-level names declared in the other screens
// (these babel scripts share one global scope).
const { tournamentHeadlines: ssHeadlines, topScorers: ssTopScorers,
        goalTimingBuckets: ssTimingBuckets, teamScoringTable: ssScoringTable,
        teamDefensiveTable: ssDefenceTable, biggestWins: ssBiggestWins,
        highestScoringMatches: ssHighScoring, hasGoalData: ssHasGoals,
        goalOwnershipLeaders: ssOwnerLeaders,
        teamByCode: tbc3, ownerOf: ownerOf3, fmtPct: pct3 } = window.SS;

function sgn3(n) { return (n >= 0 ? "+" : "") + n; }

/* ---- a headliner stat tile -------------------------------------------- */
function StatTile({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: "16px 16px 14px", minWidth: 0 }}>
      <div className="mono muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div className="display" style={{ fontSize: "clamp(26px,7vw,38px)", lineHeight: 1.05, marginTop: 6,
        color: accent || "var(--ink)" }}>{value}</div>
      {sub && <div className="mono muted" style={{ fontSize: 11.5, marginTop: 4, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  );
}

/* ---- a collapsible section with Show/Hide ------------------------------ */
function Section({ title, hint, children }) {
  const [show, setShow] = useState(true);
  return (
    <div style={{ marginTop: 28 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <SectLabel>{title}</SectLabel>
        <button className="linkbtn" style={{ margin: 0 }} onClick={() => setShow(v => !v)}>{show ? "Hide" : "Show"}</button>
      </div>
      {show && <>
        {hint && <div className="mono muted" style={{ fontSize: 12, margin: "0 2px 8px", lineHeight: 1.5 }}>{hint}</div>}
        {children}
      </>}
    </div>
  );
}

/* ---- the "no goal data yet" placeholder for scorer/timing sections ----- */
function GoalDataNote() {
  return (
    <div className="card" style={{ padding: "20px 18px", textAlign: "center" }}>
      <div className="display" style={{ fontSize: 18 }}>Not available yet</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
        Goal-scorer and timing detail flows in with the live results feed once matches kick off.
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  STATS — interesting numbers about the tournament                          */
/* ========================================================================== */
function Stats({ state, go }) {
  const played = Object.keys(state.scores || {}).length;
  if (!played)
    return <Empty title="No stats yet">
      The numbers light up once the first match is in the books.
      <div style={{ marginTop: 18 }}><Btn kind="primary" onClick={() => go("today")}>See the schedule</Btn></div>
    </Empty>;

  const h = ssHeadlines(state);
  const goalsKnown = ssHasGoals(state);
  const drawn = state.draw?.done;

  const ownerFor = (code) => ownerOf3(state, code);

  // headliner sub-lines reference a fixture pair via codes
  const matchSub = (m) => m ? `${m.fx.home} ${m.hs}–${m.as} ${m.fx.away}` : "—";

  /* ---- a single match-result row (biggest wins / highest scoring) ------- */
  const MatchResultRow = (m, caption) => {
    const home = tbc3(m.fx.home), away = tbc3(m.fx.away);
    const hw = m.hs > m.as, aw = m.as > m.hs;
    const oh = ownerFor(m.fx.home), oa = ownerFor(m.fx.away);
    return (
      <div key={m.fx.id} className="matchrow">
        <div className="mt-side" style={{ alignItems: "flex-end" }}>
          <MatchTeam team={home} align="right" strong={hw} dim={aw} />
          <div style={{ marginTop: 6 }}>{oh ? <Owner player={oh} size={20} you={oh.id === state.me} /> : null}</div>
        </div>
        <div className="mt-mid">
          <div className="scorebox">{m.hs}<span>–</span>{m.as}</div>
          <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{caption}</div>
        </div>
        <div className="mt-side">
          <MatchTeam team={away} align="left" strong={aw} dim={hw} />
          <div style={{ marginTop: 6 }}>{oa ? <Owner player={oa} size={20} you={oa.id === state.me} /> : null}</div>
        </div>
      </div>
    );
  };

  /* ---- a team row for the scoring / defence tables --------------------- */
  const TeamStatRow = (r, i, value, maxVal, color) => {
    const t = tbc3(r.code);
    const o = ownerFor(r.code);
    return (
      <div key={r.code} className="odds-row">
        <div className="mono odds-rk">{i + 1}</div>
        <div className="odds-crest"><Crest team={t} h={28} fs={13} /></div>
        <div className="odds-name">
          <div className="odds-title">{t.name}</div>
          <div className="odds-sub">Group {r.group} · {r.played} played · GD {sgn3(r.gd)}</div>
        </div>
        <div className="odds-bar"><Bar value={maxVal ? value / maxVal : 0} color={color} /></div>
        <div className="display odds-pct">{value}</div>
        <div className="odds-owner"><Owner player={o} size={22} label={false} /></div>
      </div>
    );
  };

  const scoring = ssScoringTable(state);
  const defence = ssDefenceTable(state);
  const maxGf = scoring[0]?.gf || 1;
  const maxGa = Math.max(...defence.map(r => r.ga), 1);
  const biggest = ssBiggestWins(state);
  const highest = ssHighScoring(state);

  // goal sections
  const scorers = goalsKnown ? ssTopScorers(state) : [];
  const maxGoals = scorers[0]?.goals || 1;
  const buckets = goalsKnown ? ssTimingBuckets(state) : [];
  const maxBucket = Math.max(...buckets.map(b => b.count), 1);

  // ownership leaders
  const leaders = drawn ? ssOwnerLeaders(state) : [];
  const maxOwnGf = leaders[0]?.goalsFor || 1;

  return (
    <div className="fadein">
      {/* header */}
      <div style={{ marginBottom: 18 }}>
        <div className="display" style={{ fontSize: "clamp(26px,5.5vw,34px)", textTransform: "uppercase" }}>The Stats</div>
        <div className="muted" style={{ fontSize: 14 }}>The tournament by the numbers · {h.matchesPlayed} matches played</div>
      </div>

      {/* headliner tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <StatTile label="Goals" value={h.totalGoals} sub={`${h.goalsPerMatch.toFixed(2)} per match`} accent="var(--pop)" />
        <StatTile label="Clean sheets" value={h.cleanSheets} sub="across all matches" />
        <StatTile label="Biggest win" value={h.biggestWin ? `${h.biggestWin.margin}-goal` : "—"} sub={matchSub(h.biggestWin)} accent="var(--gold)" />
        <StatTile label="Most in a match" value={h.highestScoring ? h.highestScoring.total : "—"} sub={matchSub(h.highestScoring)} />
        {goalsKnown && h.topScorer &&
          <StatTile label="Golden Boot" value={h.topScorer.goals} sub={`${h.topScorer.scorer} · ${h.topScorer.team}`} accent="var(--gold)" />}
      </div>

      {/* golden boot */}
      <Section title="Golden Boot" hint={goalsKnown ? "Top scorers — penalties counted, own goals excluded." : null}>
        {goalsKnown ? (
          <div className="card" style={{ padding: 8 }}>
            {scorers.map((s, i) => {
              const t = tbc3(s.team);
              const o = ownerFor(s.team);
              return (
                <div key={s.scorer + s.team} className="odds-row" style={i === scorers.length - 1 ? { borderBottom: "none" } : null}>
                  <div className="mono odds-rk">{i + 1}</div>
                  <div className="odds-crest"><Crest team={t} h={28} fs={13} /></div>
                  <div className="odds-name">
                    <div className="odds-title">{s.scorer}</div>
                    <div className="odds-sub">{t.name}{s.pens ? ` · ${s.pens} pen${s.pens > 1 ? "s" : ""}` : ""}</div>
                  </div>
                  <div className="odds-bar"><Bar value={s.goals / maxGoals} color={i === 0 ? "var(--gold)" : "var(--pop)"} /></div>
                  <div className="display odds-pct">{s.goals}</div>
                  <div className="odds-owner"><Owner player={o} size={22} label={false} /></div>
                </div>
              );
            })}
          </div>
        ) : <GoalDataNote />}
      </Section>

      {/* goal timing */}
      <Section title="When goals are scored" hint={goalsKnown ? "Every goal slotted into a 15-minute band (stoppage time folds into its half)." : null}>
        {goalsKnown ? (
          <div className="card" style={{ padding: "14px 16px" }}>
            {buckets.map(b => (
              <div key={b.label} className="row" style={{ gap: 12, alignItems: "center", padding: "7px 0" }}>
                <div className="mono" style={{ width: 64, fontSize: 12, color: "var(--ink-soft)" }}>{b.label}</div>
                <div style={{ flex: 1 }}><Bar value={b.count / maxBucket} color="var(--pop)" /></div>
                <div className="display" style={{ width: 34, textAlign: "right", fontSize: 18 }}>{b.count}</div>
              </div>
            ))}
          </div>
        ) : <GoalDataNote />}
      </Section>

      {/* best attacks */}
      <Section title="Best attacks" hint="Teams ranked by goals scored.">
        <div className="card" style={{ padding: 8 }}>
          {scoring.map((r, i) => TeamStatRow(r, i, r.gf, maxGf, i === 0 ? "var(--gold)" : "var(--pop)"))}
        </div>
      </Section>

      {/* best defences */}
      <Section title="Best defences" hint="Teams ranked by fewest goals conceded.">
        <div className="card" style={{ padding: 8 }}>
          {defence.map((r, i) => TeamStatRow(r, i, r.ga, maxGa, i === 0 ? "var(--gold)" : "var(--blue)"))}
        </div>
      </Section>

      {/* biggest wins */}
      <Section title="Biggest wins" hint="The most one-sided results so far.">
        <div className="card" style={{ padding: "6px 6px" }}>
          {biggest.length ? biggest.map(m => MatchResultRow(m, `+${m.margin}`))
            : <div className="mono muted" style={{ padding: 16, textAlign: "center" }}>No decisive results yet.</div>}
        </div>
      </Section>

      {/* highest scoring */}
      <Section title="Goal fests" hint="Matches with the most goals.">
        <div className="card" style={{ padding: "6px 6px" }}>
          {highest.map(m => MatchResultRow(m, `${m.total} goals`))}
        </div>
      </Section>

      {/* player ownership blend */}
      {drawn &&
        <Section title="Whose teams are scoring" hint="Goals racked up by the teams each player owns.">
          <div className="card" style={{ padding: 8 }}>
            {leaders.map((l, i) => {
              const isMe = l.player.id === state.me;
              return (
                <div key={l.player.id} className="odds-row" style={i === leaders.length - 1 ? { borderBottom: "none" } : null}>
                  <div className="mono odds-rk">{i + 1}</div>
                  <div className="odds-crest"><Avatar player={l.player} size={30} /></div>
                  <div className="odds-name">
                    <div className="odds-title">{l.player.name}{isMe && <span className="tag" style={{ marginLeft: 8, background: "var(--pop)", color: "#fff", borderColor: "var(--ink)" }}>you</span>}</div>
                    <div className="odds-sub">conceded {l.goalsAgainst} · GD {sgn3(l.gd)}{l.topScorerName ? ` · top: ${l.topScorerName}` : ""}</div>
                  </div>
                  <div className="odds-bar"><Bar value={l.goalsFor / maxOwnGf} color={i === 0 ? "var(--gold)" : "var(--pop)"} /></div>
                  <div className="display odds-pct">{l.goalsFor}</div>
                </div>
              );
            })}
          </div>
        </Section>}

      <div className="mono muted" style={{ fontSize: 12, textAlign: "center", margin: "26px 0 6px", lineHeight: 1.5 }}>
        Stats cover the group stage as results come in. Scorer &amp; timing detail appears when the live feed provides it.
      </div>
    </div>
  );
}

Object.assign(window, { Stats });
