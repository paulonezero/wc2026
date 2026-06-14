/* ============================================================================
   WC2026 SS — app root
   Shared state via window.Net (remote on Netlify, local fallback in preview).
   Device-local: which player "you" are (me) + host token. Never on the server.
   ========================================================================== */
const ME_KEY = "ss_wc26_me";
const TOKEN_KEY = "ss_wc26_token";

function App() {
  const [state, setState] = useState(null);          // shared pool (null = loading)
  const [mode, setMode] = useState(null);             // 'remote' | 'local'
  const [me, setMe] = useState(() => { try { return localStorage.getItem(ME_KEY) || null; } catch (e) { return null; } });
  const [token, setToken] = useState(() => { try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; } });
  const [tab, setTab] = useState(null);

  const admin = !!token;
  const drawn = !!(state && state.draw && state.draw.done);

  const stateRef = useRef(state); useEffect(() => { stateRef.current = state; }, [state]);
  const tokenRef = useRef(token); useEffect(() => { tokenRef.current = token; }, [token]);
  const modeRef = useRef(mode); useEffect(() => { modeRef.current = mode; }, [mode]);
  const saveTimer = useRef(null);

  // ---- initial load --------------------------------------------------------
  useEffect(() => { (async () => {
    const st = await window.Net.init();
    setMode(window.Net.getMode());
    setState(st);
  })(); }, []);

  // pick a landing tab once state arrives
  useEffect(() => {
    if (state && tab == null) setTab(state.draw.done ? "today" : (admin ? "admin" : "signup"));
  }, [state]);

  // persist device-local bits
  useEffect(() => { try { me ? localStorage.setItem(ME_KEY, me) : localStorage.removeItem(ME_KEY); } catch (e) {} }, [me]);
  useEffect(() => { try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }, [token]);

  // ---- live updates: poll for everyone who isn't actively editing (non-host)
  useEffect(() => {
    if (mode !== "remote" || admin) return;
    const pull = () => window.Net.getState().then(setState).catch(() => {});
    const iv = setInterval(pull, 20000);
    const onVis = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [mode, admin]);

  // ---- persistence of host edits (debounced) -------------------------------
  function persist(next) {
    if (modeRef.current !== "remote") { try { window.Store.save(next); } catch (e) {} return; }
    clearTimeout(saveTimer.current);
    const tk = tokenRef.current;
    saveTimer.current = setTimeout(() => {
      window.Net.save(next, tk).catch(err => {
        if (err && err.status === 401) { setToken(null); window.alert("Host session expired — please log in again."); }
      });
    }, 500);
  }
  function update(mutator) {
    const next = (typeof structuredClone === "function") ? structuredClone(stateRef.current) : JSON.parse(JSON.stringify(stateRef.current));
    mutator(next);
    setState(next);
    persist(next);
  }
  const go = (t) => { setTab(t); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // ---- sign up (public) ----------------------------------------------------
  async function onJoin(name) {
    const n = (name || "").trim(); if (!n) return;
    try { const { state: st, you } = await window.Net.signup(n); setState(st); setMe(you); }
    catch (e) { window.alert(e.message || "Could not sign up."); }
  }
  function onForget() { setMe(null); }

  // ---- host login ----------------------------------------------------------
  async function unlock() {
    const pin = window.prompt("Host access code:");
    if (pin == null) return;
    const ok = await window.Net.verify(pin.trim(), stateRef.current);
    if (ok) { setToken(pin.trim()); go("admin"); } else window.alert("Wrong code.");
  }
  function lock() { setToken(null); go(drawn ? "today" : "signup"); }

  // ---- loading splash ------------------------------------------------------
  if (!state || tab == null) {
    return (
      <div className="app center" style={{ minHeight: "70vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="mark" style={{ margin: "0 auto 14px", width: 48, height: 48 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2 L20 6 V13 C20 18 16.5 21 12 22.5 C7.5 21 4 18 4 13 V6 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
          </div>
          <div className="mono muted" style={{ fontSize: 13, letterSpacing: ".2em", textTransform: "uppercase" }}>Loading pool…</div>
        </div>
      </div>
    );
  }

  // inject device-local identity + mode for the screens (read-only)
  const meValid = me && state.players.some(p => p.id === me) ? me : null;
  const view = { ...state, me: meValid, mode };

  // ---- tab visibility ------------------------------------------------------
  let TABS;
  if (drawn) {
    TABS = [{ key: "today", label: "Today" }, { key: "standings", label: "Standings" }, { key: "teams", label: "Teams" }];
    if (admin) TABS.push({ key: "admin", label: "Admin" });
  } else if (admin) {
    TABS = [{ key: "signup", label: "Sign Up" }, { key: "teams", label: "Teams" },
            { key: "today", label: "Today" }, { key: "standings", label: "Standings" },
            { key: "admin", label: "Admin", dot: state.players.length >= 2 }];
  } else {
    TABS = [{ key: "signup", label: "Sign Up" }];
  }
  const validKeys = new Set([...TABS.map(t => t.key), ...(admin ? ["draw"] : [])]);
  const safeTab = validKeys.has(tab) ? tab : (drawn ? "today" : (admin ? "admin" : "signup"));

  const screens = {
    signup: <SignUp state={view} onJoin={onJoin} onForget={onForget} go={go} />,
    today: <Today state={view} go={go} />,
    standings: <Standings state={view} go={go} />,
    teams: <Teams state={view} go={go} />,
    draw: <Draw state={view} update={update} go={go} />,
    admin: <Admin state={view} update={update} go={go} token={token} />,
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand" onClick={() => go(drawn ? "today" : (admin ? "admin" : "signup"))}>
          <div className="mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 L20 6 V13 C20 18 16.5 21 12 22.5 C7.5 21 4 18 4 13 V6 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
              <path d="M12 8.2 L14.3 9.9 L13.4 12.6 H10.6 L9.7 9.9 Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="bt">WC2026 SS<small>World Cup 2026 · Sweepstake</small></div>
        </div>
        <div className="potchip">
          <span className="pl">Pot</span>
          <span className="pv">{state.currency}{state.pot || "?"}</span>
        </div>
        {admin
          ? <button className="hostbtn on" onClick={lock} title="Exit host mode"><span className="hostdot"></span> Host</button>
          : <button className="hostbtn" onClick={unlock} title="Host access">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 11V8a6 6 0 1112 0v3M5 11h14v9H5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
              Host
            </button>}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={"tab" + (safeTab === t.key ? " on" : "")} onClick={() => go(t.key)}>
            {t.label}{t.dot && <span className="dot"></span>}
          </button>
        ))}
      </div>

      {screens[safeTab]}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
