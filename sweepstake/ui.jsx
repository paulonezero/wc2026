/* ============================================================================
   SWEEPSTAKE · WORLD CUP 2026 — shared UI components
   ========================================================================== */
const { useState, useEffect, useRef, useMemo } = React;
const { TEAMS, CONFED_LABEL, fmtPct, flagURL } = window.SS;

/* ---- Crest: real flag block, optional code lower-third ----------------- */
function Crest({ team, h = 90, fs = 34, code = true }) {
  const showCode = code && fs >= 20;
  return (
    <div className="crest" style={{ height: h, background: team.colors[0] }}>
      <img className="flagimg" src={flagURL(team)} alt={team.name} loading="lazy"
           draggable={false} onError={e => { e.target.style.display = "none"; }} />
      {showCode && <span className="ccode" style={{ fontSize: fs * 0.46 }}>{team.code}</span>}
    </div>
  );
}

/* ---- Sticker: full collectible card ------------------------------------ */
function Sticker({ team, rank, prob, status = "alive", champion = false, owner = null,
                   onClick, hover = true, style }) {
  const out = status === "out";
  return (
    <div className={"sticker" + (champion ? " foil" : "") + (out ? " out" : "") + (hover ? " hov" : "")}
         onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", ...style }}>
      {rank != null && <div className="rank">#{rank}</div>}
      {owner && <div className="ownerbadge"><Avatar player={owner} size={26} /></div>}
      <Crest team={team} />
      <div className="nm">{team.name}</div>
      <div className="meta">
        <span>{CONFED_LABEL[team.confed]}</span>
        {prob != null && <span className="odd">{fmtPct(prob)}</span>}
      </div>
    </div>
  );
}

/* ---- Avatar ------------------------------------------------------------ */
function Avatar({ player, size = 34 }) {
  if (!player) return null;
  const initials = player.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="ava" title={player.name}
         style={{ width: size, height: size, background: player.color, fontSize: size * 0.42 }}>
      {initials}
    </div>
  );
}

/* ---- Button ------------------------------------------------------------ */
function Btn({ kind = "primary", size, children, ...rest }) {
  return <button className={`btn ${kind}${size ? " " + size : ""}`} {...rest}>{children}</button>;
}

/* ---- small team flag chip ---------------------------------------------- */
function TeamChip({ team, dead, code = false }) {
  return (
    <span className={"tchip" + (dead ? " dead" : "")} title={team.name}>
      <img className="flagimg" src={flagURL(team, 80)} alt={team.name} loading="lazy"
           draggable={false} onError={e => { e.target.style.display = "none"; }} />
      {code && <span className="tchip-code">{team.code}</span>}
    </span>
  );
}

/* ---- odds bar ---------------------------------------------------------- */
function Bar({ value, color = "var(--pop)" }) {
  return <div className="bar"><i style={{ width: Math.max(2, value * 100) + "%", background: color }}></i></div>;
}

/* ---- section label ----------------------------------------------------- */
function SectLabel({ children }) { return <div className="sectlabel">{children}</div>; }

/* ---- confetti burst ---------------------------------------------------- */
function fireConfetti(n = 60) {
  const cols = ["#0E9E55", "#27C06E", "#C99A3F", "#1D6FB8", "#FFFFFF"];
  for (let i = 0; i < n; i++) {
    const pc = document.createElement("div");
    pc.className = "confetti-pc";
    const c = cols[Math.floor(Math.random() * cols.length)];
    pc.style.background = c;
    pc.style.left = Math.random() * 100 + "vw";
    pc.style.height = (8 + Math.random() * 10) + "px";
    pc.style.width = (5 + Math.random() * 5) + "px";
    if (Math.random() > 0.6) pc.style.borderRadius = "50%";
    document.body.appendChild(pc);
    const dur = 1900 + Math.random() * 1500;
    const xEnd = (Math.random() - 0.5) * 240;
    pc.animate([
      { transform: `translate(0,0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${xEnd}px, ${window.innerHeight + 60}px) rotate(${540 * (Math.random() > .5 ? 1 : -1)}deg)`, opacity: 1 }
    ], { duration: dur, easing: "cubic-bezier(.3,.7,.5,1)" });
    setTimeout(() => pc.remove(), dur);
  }
}

/* ---- empty-state ------------------------------------------------------- */
function Empty({ title, children }) {
  return (
    <div className="panel center" style={{ flexDirection: "column", textAlign: "center", padding: "56px 30px", gap: 10 }}>
      <div className="display" style={{ fontSize: 30 }}>{title}</div>
      <div className="muted" style={{ maxWidth: 440, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

/* ---- Owner: avatar + name (or undrawn placeholder) --------------------- */
function Owner({ player, size = 22, you = false, label = true }) {
  if (!player) return <span className="mono muted" style={{ fontSize: 12 }}>—</span>;
  return (
    <span className="row" style={{ gap: 6, display: "inline-flex" }} title={player.name}>
      <Avatar player={player} size={size} />
      {label && <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>
        {player.name}{you && <span style={{ color: "var(--pop)" }}> · you</span>}
      </span>}
    </span>
  );
}

/* ---- MatchTeam: crest + name, used in fixture rows --------------------- */
function MatchTeam({ team, align = "left", strong = false, dim = false }) {
  return (
    <div className="row" style={{ gap: 10, flexDirection: align === "right" ? "row-reverse" : "row",
      opacity: dim ? .5 : 1, minWidth: 0 }}>
      <div style={{ width: 42, flex: "none" }}><Crest team={team} h={30} fs={14} /></div>
      <div className="display" style={{ fontSize: 15, textTransform: "uppercase", lineHeight: 1,
        fontWeight: strong ? 800 : 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        textAlign: align }}>{team.name}</div>
    </div>
  );
}

Object.assign(window, { Crest, Sticker, Avatar, Btn, TeamChip, Bar, SectLabel, fireConfetti, Empty, Owner, MatchTeam });
