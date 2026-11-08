import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { BrowserProvider, Contract, isAddress, ZeroAddress } from "ethers";
import { CONTRACT_ADDRESS, EXPLORER_URL, PASS_ABI, SEPOLIA_CHAIN_HEX, SEPOLIA_CHAIN_ID } from "./contract.js";
import { DEMO_STORAGE_KEY, DEMO_PROFILES, demoReducer, readDemo } from "./demo.js";
import { LANGUAGES, useLang } from "./i18n.js";

const configured = isAddress(CONTRACT_ADDRESS) && CONTRACT_ADDRESS !== ZeroAddress;
const short = value => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";
const emptyWallet = { account: "", chainId: "", organizer: "", ticketId: "", checkedIn: false, total: "—" };
const roleLabel = (role, t) => t(`role.${role}`);
const profileLabel = (profile, t) => profile && profile.nameKey ? t(profile.nameKey) : profile ? profile.name : "";
const personLabel = (name, t) => {
  const profile = DEMO_PROFILES.find(candidate => candidate.name === name);
  return profile ? profileLabel(profile, t) : name;
};

// Errors raised by this app carry translation keys; wallet errors keep their raw message.
function requestError(key, vars) {
  const error = new Error(key);
  error.i18nKey = key;
  if (vars) error.i18nVars = vars;
  return error;
}
function errorStatus(error) {
  if (error && typeof error === "object" && typeof error.i18nKey === "string") return { key: error.i18nKey, vars: error.i18nVars };
  const message = `${error?.shortMessage || ""} ${error?.reason || ""} ${error?.message || ""}`;
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") return { key: "error.rejected" };
  const known = [
    ["AlreadyClaimed", "error.alreadyClaimed"],
    ["AlreadyCheckedIn", "error.alreadyCheckedIn"],
    ["TicketDoesNotExist", "error.ticketDoesNotExist"],
    ["OwnableUnauthorizedAccount", "error.onlyOwner"],
  ];
  for (const [code, key] of known) if (message.includes(code)) return { key };
  if (message.includes("insufficient funds")) return { key: "error.insufficientFunds" };
  const raw = error?.shortMessage || error?.reason || error?.message;
  return raw ? { raw } : { key: "error.generic" };
}
function errorText(error, t) {
  const status = errorStatus(error);
  return status.raw ? status.raw : t(status.key, status.vars);
}
function resolveStatusVars(vars, t) {
  if (!vars) return undefined;
  const resolved = {};
  for (const [name, value] of Object.entries(vars)) {
    if (value instanceof Error) resolved[name] = errorText(value, t);
    else if (value && typeof value === "object" && typeof value.key === "string") resolved[name] = t(value.key, value.vars);
    else resolved[name] = value;
  }
  return resolved;
}
function statusText(status, t) {
  if (!status) return "";
  if (status.raw) return status.raw;
  return t(status.key, resolveStatusVars(status.vars, t));
}
function activityText(entry, t) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  if (entry.type === "claim") return t("activity.claim", { name: personLabel(entry.name, t), id: entry.id });
  if (entry.type === "checkIn") return t("activity.checkIn", { id: entry.id });
  return "";
}
function provider() {
  if (!window.ethereum) throw requestError("error.walletMissing");
  return new BrowserProvider(window.ethereum);
}
async function ensureSepolia() {
  const chain = await window.ethereum.request({ method: "eth_chainId" });
  if (BigInt(chain) !== SEPOLIA_CHAIN_ID) {
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX }] }); }
    catch (e) { if (e.code === 4902) throw requestError("error.addSepolia"); throw e; }
  }
}

export default function App() {
  const { lang, setLang, t } = useLang();
  const [mode, setMode] = useState(configured ? "chain" : "demo");
  const [demo, dispatch] = useReducer(demoReducer, undefined, readDemo);
  const [storageWarning, setStorageWarning] = useState(false);
  const [wallet, setWallet] = useState(emptyWallet);
  const [status, setStatus] = useState(null);
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkInId, setCheckInId] = useState("");
  const [cardBurst, setCardBurst] = useState(false);
  const epoch = useRef(0), reads = useRef(0), operation = useRef(0), lock = useRef(false);
  const burstCard = () => {
    setCardBurst(false);
    window.requestAnimationFrame(() => setCardBurst(true));
  };
  const isDemo = mode === "demo";
  const profile = DEMO_PROFILES.find(p => p.id === demo.profile);
  const onSepolia = wallet.chainId === SEPOLIA_CHAIN_ID.toString();
  const ownTicket = demo.tickets[demo.profile];
  const ticketId = isDemo ? ownTicket?.id : wallet.ticketId;
  const checkedIn = isDemo ? ownTicket?.checkedIn : wallet.checkedIn;
  const isOrganizer = isDemo ? profile.role === "organizer" : Boolean(wallet.account && wallet.organizer && wallet.account.toLowerCase() === wallet.organizer.toLowerCase());
  const total = isDemo ? Object.keys(demo.tickets).length : wallet.total;

  // Persist before paint so a reload immediately after a click retains the committed demo.
  useLayoutEffect(() => { try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demo)); setStorageWarning(false); } catch { setStorageWarning(true); } }, [demo]);

  const syncWallet = useCallback(async () => {
    const version = ++reads.current, environment = epoch.current;
    const valid = () => version === reads.current && environment === epoch.current;
    if (!window.ethereum) return;
    try {
    const [accounts, chain] = await Promise.all([window.ethereum.request({ method: "eth_accounts" }), window.ethereum.request({ method: "eth_chainId" })]);
    if (!valid()) return;
    const account = accounts[0] || "", chainId = BigInt(chain).toString();
    setWallet({ ...emptyWallet, account, chainId });
    if (!account || BigInt(chain) !== SEPOLIA_CHAIN_ID || !configured) return;
    const readProvider = provider();
    if (await readProvider.getCode(CONTRACT_ADDRESS) === "0x") throw requestError("error.noContract");
    if (!valid()) return;
    const contract = new Contract(CONTRACT_ADDRESS, PASS_ABI, readProvider);
    const [owned, count, owner] = await Promise.all([contract.ticketOf(account), contract.totalClaims(), contract.owner()]);
    const attended = owned === 0n ? false : await contract.checkedIn(owned);
    if (valid()) setWallet({ account, chainId, organizer: owner, ticketId: owned === 0n ? "" : owned.toString(), checkedIn: attended, total: count.toString() });
    } catch (e) { if (valid()) throw e; }
  }, []);

  useEffect(() => {
    if (mode !== "chain" || !window.ethereum) return;
    let active = true;
    const refresh = () => {
      epoch.current++; operation.current++; lock.current = false; setBusy(false); setHash(""); setWallet(emptyWallet);
      setStatus({ key: "status.walletContext" });
      const current = epoch.current;
      syncWallet().catch(e => { if (active && epoch.current === current) setStatus(errorStatus(e)); });
    };
    const current = epoch.current;
    syncWallet().catch(e => { if (active && epoch.current === current) setStatus(errorStatus(e)); });
    window.ethereum.on?.("accountsChanged", refresh); window.ethereum.on?.("chainChanged", refresh);
    return () => { active = false; epoch.current++; reads.current++; window.ethereum.removeListener?.("accountsChanged", refresh); window.ethereum.removeListener?.("chainChanged", refresh); };
  }, [mode, syncWallet]);

  function changeMode(next) {
    if (next === mode) return;
    epoch.current++; reads.current++; operation.current++; lock.current = false; setBusy(false); setWallet(emptyWallet); setHash(""); setStatus(null); setCheckInId(""); setMode(next);
  }
  async function connect() {
    if (lock.current) return;
    lock.current = true; setBusy(true); const token = ++operation.current;
    try {
      setStatus({ key: "status.approveConnection" });
      await provider().send("eth_requestAccounts", []); await ensureSepolia();
      if (token !== operation.current) return;
      await syncWallet(); if (token === operation.current) setStatus({ key: "status.walletConnected" });
    } catch (e) { if (token === operation.current) setStatus(errorStatus(e)); }
    finally { if (token === operation.current) { lock.current = false; setBusy(false); } }
  }
  async function transact(labelKey, submit) {
    if (lock.current || !configured || !wallet.account || !onSepolia) return;
    const token = ++operation.current, environment = epoch.current, expectedAccount = wallet.account.toLowerCase();
    const valid = () => token === operation.current && environment === epoch.current;
    lock.current = true; setBusy(true); setHash("");
    try {
      const p = provider();
      const [accounts, chain] = await Promise.all([window.ethereum.request({ method: "eth_accounts" }), window.ethereum.request({ method: "eth_chainId" })]);
      if (!valid()) return;
      if (accounts[0]?.toLowerCase() !== expectedAccount || BigInt(chain) !== SEPOLIA_CHAIN_ID) throw requestError("error.accountNetworkChanged");
      const signer = await p.getSigner();
      if (!valid()) return;
      if ((await signer.getAddress()).toLowerCase() !== expectedAccount) throw requestError("error.accountChanged");
      if (!valid()) return;
      setStatus({ key: "status.confirm", vars: { action: { key: `${labelKey}Progress` } } });
      const tx = await submit(new Contract(CONTRACT_ADDRESS, PASS_ABI, signer));
      if (!valid()) return;
      setHash(tx.hash); setStatus({ key: "status.submitted" });
      const receipt = await tx.wait();
      if (!valid()) return;
      if (receipt.status !== 1) throw requestError("error.txFailed");
      setStatus({ key: "status.confirmedRefreshing", vars: { action: { key: labelKey } } });
      try { await syncWallet(); if (valid()) setStatus({ key: "status.confirmed", vars: { action: { key: labelKey } } }); }
      catch (e) { if (valid()) setStatus({ key: "status.confirmedRefreshFailed", vars: { action: { key: labelKey }, error: e } }); }
    } catch (e) { if (valid()) setStatus(errorStatus(e)); }
    finally { if (valid()) { lock.current = false; setBusy(false); } }
  }
  function claim() {
    if (isDemo) {
      if (ownTicket) return;
      dispatch({ type: "claim" });
      setStatus({ key: "status.demoClaimed" });
    } else transact("action.claim", c => c.claim());
  }
  function checkIn(e) {
    e.preventDefault();
    if (!/^[1-9]\d*$/.test(checkInId)) { setStatus({ key: "status.invalidTicket" }); return; }
    if (isDemo) {
      const entry = Object.values(demo.tickets).find(ticket => String(ticket.id) === checkInId);
      if (!entry) return setStatus({ key: "status.demoTicketMissing" });
      if (entry.checkedIn) return setStatus({ key: "status.demoAlreadyCheckedIn" });
      if (!isOrganizer) return setStatus({ key: "status.notOrganizer" });
      dispatch({ type: "checkIn", id: entry.id });
      setStatus({ key: "status.demoCheckedIn", vars: { id: entry.id } });
    } else transact("action.checkIn", c => c.checkIn(BigInt(checkInId)));
  }
  async function refresh() {
    const current = epoch.current;
    try { await syncWallet(); if (current === epoch.current) setStatus({ key: "status.contractRefreshed" }); }
    catch (e) { if (current === epoch.current) setStatus(errorStatus(e)); }
  }

  return <div className="site-shell">
    <a className="skip-link" href="#dashboard">{t("a11y.skip")}</a>
    <header className="site-header">
      <a className="brand" href="#top"><span className="brand-mark">C</span><span>CAMPUS<span className="brand-accent">/</span>PASS</span></a>
      <nav aria-label={t("a11y.mainNav")}><a href="#dashboard">{t("nav.yourPass")}</a><a href="#how-it-works">{t("nav.howItWorks")}</a></nav>
      <div className="header-actions">
        <div className="lang-switch" role="group" aria-label={t("a11y.language")}>
          {LANGUAGES.map(language => <button key={language.id} type="button" lang={language.id} aria-pressed={lang === language.id} aria-label={t("a11y.switchTo", { language: t(language.nameKey) })} onClick={() => setLang(language.id)}>{language.label}</button>)}
        </div>
        <span className="network-badge"><span className="network-dot" />{isDemo ? t("network.demo") : "SEPOLIA TESTNET"}</span>
      </div>
    </header>
    <main id="top">
      <div className="mode-bar">
        <div><strong>{t(isDemo ? "mode.demoTitle" : "mode.chainTitle")}</strong><span>{t(isDemo ? "mode.demoBody" : configured ? "mode.chainBody.configured" : "mode.chainBody")}</span></div>
        <div className="mode-switch" role="group" aria-label={t("a11y.appMode")}>
          <button type="button" aria-pressed={isDemo} onClick={() => changeMode("demo")}>{t("mode.demo")}</button>
          <button type="button" aria-pressed={!isDemo} onClick={() => changeMode("chain")}>{t("mode.sepolia")}</button>
        </div>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{t("hero.eyebrow")}</span>
          <h1>{t("hero.title1")}<br />{t("hero.title2")}<em>{t("hero.title3")}</em></h1>
          <p>{t("hero.body")}</p>
          <div className="event-meta"><span>{t("hero.meta.event")}</span><span>{t("hero.meta.nft")}</span></div>
          <div className="hero-actions">
            {!isDemo && !wallet.account
              ? <button className="button button-primary" onClick={connect} disabled={busy || !configured}>{t("hero.connect")} <span aria-hidden="true">↗</span></button>
              : <button className="button button-primary" onClick={claim} disabled={busy || Boolean(ticketId) || (!isDemo && (!onSepolia || !configured))}>{busy ? t("common.processing") : ticketId ? t("hero.claimed") : isDemo ? t("hero.tryClaim") : t("hero.claim")}<span aria-hidden="true"> ↗</span></button>}
            <a className="text-link" href="#dashboard">{t("hero.openDashboard")} <span aria-hidden="true">↓</span></a>
          </div>
          <p className="action-note">{t(isDemo ? "hero.note.demo" : "hero.note.chain")}</p>
          <div className="hero-stats">
            <div><strong>{total}</strong><span>{t(isDemo ? "hero.stats.demoClaimed" : "hero.stats.chainClaimed")}</span></div>
            <div><strong>01</strong><span>{t("hero.stats.perIdentity")}</span></div>
            <div><strong>ERC-721</strong><span>{t("hero.stats.ownership")}</span></div>
          </div>
        </div>
        <div className="pass-wrap">
          <div
            className={`pass-card${cardBurst ? " is-bursting" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={t("pass.animate")}
            title={t("pass.animate")}
            onClick={burstCard}
            onAnimationEnd={() => setCardBurst(false)}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                burstCard();
              }
            }}
          >
            <div className="pass-top"><span>CAMPUS<br />WEB3</span><span className="pass-icon" aria-hidden="true">✳</span></div>
            <div className="pass-title">EVENT<br />PASS<span>.</span></div>
            <div className="pass-bottom">
              <span>{t(isDemo ? "pass.demoLabel" : "pass.chainLabel")}<br /><small>{ticketId ? checkedIn ? t("pass.attendanceConfirmed") : t("pass.readyCheckIn") : t("pass.preview")}</small></span>
              <span className="pass-number">{ticketId ? `#${String(ticketId).padStart(3, "0")}` : "#—"}</span>
            </div>
          </div>
          <span className="orbit orbit-one" /><span className="orbit orbit-two" />
          <span className="pass-caption">{t("pass.caption")}</span>
        </div>
      </section>
      <section id="dashboard" className="dashboard" aria-labelledby="dashboard-title">
        <div className="section-heading">
          <div><span className="eyebrow">{t(isDemo ? "dashboard.eyebrow.demo" : "dashboard.eyebrow.chain")}</span><h2 id="dashboard-title">{t("dashboard.title")}</h2></div>
          {!isDemo && <button className="button button-quiet" disabled={!wallet.account || busy} onClick={refresh}>{t("dashboard.refresh")} ↻</button>}
        </div>
        {isDemo ? <div className="demo-controls">
          <div className="demo-disclaimer"><strong>{t("demo.banner.title")}</strong><p>{t("demo.banner.body")}</p></div>
          <div className="profile-controls">
            <label htmlFor="demo-profile">{t("demo.profileLabel")}</label>
            <select id="demo-profile" value={demo.profile} onChange={e => { dispatch({ type: "profile", id: e.target.value }); setStatus(null); setCheckInId(""); }}>{DEMO_PROFILES.map(p => <option key={p.id} value={p.id}>{profileLabel(p, t)} · {roleLabel(p.role, t)}</option>)}</select>
            <button className="button button-quiet" onClick={() => { dispatch({ type: "reset" }); setCheckInId(""); setStatus({ key: "demo.resetStatus" }); }}>{t("demo.reset")}</button>
          </div>
        </div> : <>
          {!configured && <div className="notice notice-warning">{t("notice.notConfigured.before")} <code>VITE_CONTRACT_ADDRESS</code>{t("notice.notConfigured.after")}</div>}
          {wallet.account && !onSepolia && <div className="notice notice-warning">{t("notice.wrongNetwork")}<button className="inline-button" onClick={connect} disabled={busy}>{t("notice.switchNetwork")}</button></div>}
          <div className="chain-detail"><span>{t("chain.contract")}</span>{configured ? <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{short(CONTRACT_ADDRESS)} ↗</a> : <span>{t("chain.notDeployed")}</span>}</div>
        </>}
        {storageWarning && isDemo && <div className="notice notice-warning">{t("notice.storage")}</div>}
        <div className="dashboard-grid">
          <article className="info-card">
            <span className="card-label">{t(isDemo ? "card.demoIdentity" : "card.connectedWallet")}</span>
            <strong title={!isDemo ? wallet.account : undefined}>{isDemo ? profileLabel(profile, t) : wallet.account ? short(wallet.account) : t("card.notConnected")}</strong>
            <span className="card-foot">{isDemo ? roleLabel(profile.role, t) : wallet.account ? onSepolia ? isOrganizer ? t("role.onSepolia", { role: t("role.organizer") }) : t("role.onSepolia", { role: t("role.attendee") }) : t("card.networkSwitchNeeded") : t("card.connectWallet")}</span>
          </article>
          <article className="info-card">
            <span className="card-label">{t(isDemo ? "card.yourDemoPass" : "card.yourPass")}</span>
            <strong>{ticketId ? t("card.passNumber", { id: ticketId }) : t("card.readyToClaim")}</strong>
            <span className="card-foot">{ticketId ? checkedIn ? t("card.checkedIn") : t("card.waitingCheckIn") : t("card.onePass")}</span>
          </article>
          <article className="info-card">
            <span className="card-label">{t("card.attendance")}</span>
            <strong>{ticketId ? checkedIn ? t("card.onList") : t("card.seeYou") : t("card.joinNextWave")}</strong>
            <span className="card-foot">{ticketId ? checkedIn ? isDemo ? t("card.simulatedAttendance") : t("card.confirmedByOrganizer") : t("card.showPassNumber") : t("card.claimToRegister")}</span>
          </article>
        </div>
        <p className={`status ${status ? "" : "status-idle"}`} role="status" aria-live="polite">{status ? statusText(status, t) : t(isDemo ? "status.idle.demo" : "status.idle.chain")}</p>
        {!isDemo && hash && <a className="transaction-link" href={`${EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noreferrer">{t("tx.viewTransaction", { hash: short(hash) })}</a>}
        {!isDemo && ticketId && <a className="transaction-link" href={`${EXPLORER_URL}/token/${CONTRACT_ADDRESS}?a=${ticketId}`} target="_blank" rel="noreferrer">{t("tx.viewPass")}</a>}
      </section>
      {isOrganizer && (isDemo || onSepolia) && <section className="organizer-panel" aria-labelledby="organizer-title">
        <div>
          <span className="eyebrow">{t(isDemo ? "organizer.eyebrow.demo" : "organizer.eyebrow.chain")}</span>
          <h2 id="organizer-title">{t("organizer.title")}</h2>
          <p>{t("organizer.body")} {t(isDemo ? "organizer.body.demo" : "organizer.body.chain")}</p>
        </div>
        <form className="checkin-form" onSubmit={checkIn}>
          <label htmlFor="ticket-number">{t("organizer.label")}</label>
          <div>
            <input id="ticket-number" inputMode="numeric" pattern="[1-9][0-9]*" required maxLength={78} placeholder={t("organizer.placeholder")} value={checkInId} onChange={e => setCheckInId(e.target.value)} />
            <button className="button button-primary" disabled={busy} type="submit">{busy ? t("common.processing") : <>{t("organizer.submit")} <span aria-hidden="true">↗</span></>}</button>
          </div>
        </form>
      </section>}
      {isDemo && <section className="demo-ledger" aria-labelledby="activity-title">
        <div className="section-heading">
          <div><span className="eyebrow">{t("ledger.eyebrow")}</span><h2 id="activity-title">{t("ledger.title")}</h2></div>
          <span className="count-chip">{t("ledger.count", { checked: Object.values(demo.tickets).filter(ticket => ticket.checkedIn).length, total })}</span>
        </div>
        {Number(total) ? <div className="guest-list">
          {DEMO_PROFILES.filter(p => demo.tickets[p.id]).map(p => <article key={p.id}>
            <span className="guest-avatar" aria-hidden="true">{profileLabel(p, t)[0]}</span>
            <div><strong>{profileLabel(p, t)}</strong><span>{t("ledger.guestPass", { id: demo.tickets[p.id].id })}</span></div>
            <span className={`guest-status ${demo.tickets[p.id].checkedIn ? "attended" : ""}`}>{demo.tickets[p.id].checkedIn ? t("ledger.checkedIn") : t("ledger.registered")}</span>
          </article>)}
        </div> : <div className="empty-state"><span aria-hidden="true">↗</span><p>{t("ledger.empty")}</p></div>}
        {demo.activity.length > 0 && <details className="activity-log"><summary>{t("ledger.activitySummary")}</summary><ol>{demo.activity.map((entry, index) => <li key={`${index}-${typeof entry === "string" ? entry : entry.id}`}>{activityText(entry, t)}</li>)}</ol></details>}
      </section>}
      <section id="how-it-works" className="how-section">
        <div className="section-heading"><div><span className="eyebrow">{t("how.eyebrow")}</span><h2>{t("how.title")}</h2></div></div>
        <div className="steps">
          <article><span>{t("how.step1Tag")}</span><h3>{t(isDemo ? "how.step1Title.demo" : "how.step1Title.chain")}</h3><p>{t(isDemo ? "how.step1Body.demo" : "how.step1Body.chain")}</p></article>
          <article><span>{t("how.step2Tag")}</span><h3>{t("how.step2Title")}</h3><p>{t(isDemo ? "how.step2Body.demo" : "how.step2Body.chain")}</p></article>
          <article><span>{t("how.step3Tag")}</span><h3>{t("how.step3Title")}</h3><p>{t(isDemo ? "how.step3Body.demo" : "how.step3Body.chain")}</p></article>
        </div>
      </section>
    </main>
    <footer><span>{t("footer.brand")}</span><span>{t(isDemo ? "footer.demo" : "footer.chain")}</span></footer>
  </div>;
}
