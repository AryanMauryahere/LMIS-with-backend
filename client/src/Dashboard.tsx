import { useEffect, useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, LogOut, ShieldCheck } from 'lucide-react';
import { ApiError, getForecast, matchSkills, runScenario } from './api';
import type { Forecast, Match, Scen, Session } from './api';

type Tab = 'Overview' | 'Forecasts' | 'Scenarios' | 'Skills match';
interface Row { month: string; demand?: number; supply?: number; fDemand?: number; fSupply?: number; band?: [number, number] }
const ROLE_LABEL = { planner: 'Policy Planner', officer: 'Data Officer', analyst: 'Skill Analyst' } as const;
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export default function Dashboard({ session, onLogout }: { session: Session | null; onLogout: () => void }) {
  const staff = session !== null;
  const canPlan = staff && session.role !== 'officer';
  const tabs: Tab[] = canPlan ? ['Overview', 'Forecasts', 'Scenarios', 'Skills match'] : ['Overview', 'Forecasts'];
  const [tab, setTab] = useState<Tab>('Overview');
  const [horizon, setHorizon] = useState(6);
  const [model, setModel] = useState<'holt' | 'arima'>('holt');
  const [data, setData] = useState<Forecast | null>(null);
  const [error, setError] = useState('');
  const token = session?.token;

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) onLogout();   // token expired -> back to login
    else setError(e instanceof Error ? e.message : 'Request failed');
  };

  useEffect(() => {
    let live = true;
    setError('');
    getForecast(horizon, model, token).then(d => { if (live) setData(d); }).catch(e => { if (live) fail(e); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, model, token]);

  const chart = useMemo<Row[]>(() => {
    if (!data) return [];
    const rows: Row[] = data.history.map(p => ({ month: p.month, demand: p.demand, supply: p.supply }));
    const last = data.history[data.history.length - 1];
    rows[rows.length - 1] = { ...rows[rows.length - 1], fDemand: last.demand, fSupply: last.supply };   // join the two lines
    return [...rows, ...data.points.map(p => ({ month: p.month, fDemand: p.demand, fSupply: p.supply, band: [p.lower, p.upper] as [number, number] }))];
  }, [data]);

  const end = data?.points[data.points.length - 1];
  const gap = end ? end.demand - end.supply : 0;
  const now = data?.history[data.history.length - 1];

  const exportCsv = () => {
    if (!data) return;
    const lines = ['month,demand,supply,type', ...data.history.map(p => `${p.month},${p.demand},${p.supply},observed`), ...data.points.map(p => `${p.month},${p.demand},${p.supply},forecast`)];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = 'karyadrishti-forecast.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand"><img src="/KaryaDrishti_Logo.png" alt="" /><span><strong>KaryaDrishti</strong><small>Labour market intelligence</small></span></div>
        <nav className="main-nav" aria-label="Main navigation">
          {tabs.map(t => <button key={t} className={'nav-item' + (tab === t ? ' active' : '')} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{t}</button>)}
        </nav>
        <button className="btn logout" onClick={onLogout}><LogOut size={17} />{staff ? 'Sign out' : 'Back to login'}</button>
      </header>

      <div className="account-strip">
        <div>{staff ? <><strong>{session.name}</strong><span>{ROLE_LABEL[session.role]}</span></> : <><strong>Public view</strong><span>Read-only</span></>}</div>
        <div><ShieldCheck size={15} />Synthetic demonstration data · Maharashtra pilot</div>
      </div>

      <main className="workspace">
        {error && <div className="note error" role="alert">{error}</div>}

        <section className="dash-hero">
          <div className="dash-hero-copy">
            <span className="kicker">National labour market intelligence</span>
            <h1>See the workforce. Shape what comes next.</h1>
            <p>Compare projected job demand with qualified training supply and see where a gap may open.</p>
          </div>
          <div className="dash-art" role="img" aria-label="Illustration of a person using a laptop." />
        </section>

        <div className="toolbar">
          <label>Forecast window
            <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></select>
          </label>
          {staff && <label>Model
            <select value={model} onChange={e => setModel(e.target.value as 'holt' | 'arima')}><option value="holt">Holt smoothing</option><option value="arima">ARIMA (1,1,1)</option></select>
          </label>}
          <button className="btn" onClick={exportCsv} disabled={!data}><Download size={16} />Export CSV</button>
        </div>

        {(tab === 'Overview' || tab === 'Forecasts') && (
          <>
            {tab === 'Overview' && data && now && end && (
              <div className="kpis">
                <article><small>Demand now</small><strong>{fmt(now.demand)}</strong><p>{now.month} · observed</p></article>
                <article><small>Qualified supply now</small><strong>{fmt(now.supply)}</strong><p>{now.month} · observed</p></article>
                <article><small>Projected gap</small><strong className={gap > 0 ? 'warn' : 'ok'}>{gap > 0 ? '−' : '+'}{fmt(Math.abs(gap))}</strong><p>{gap > 0 ? 'Shortage' : 'Surplus'} by {end.month} ({((Math.abs(gap) / end.demand) * 100).toFixed(1)}% of demand)</p></article>
                <article><small>Backtest accuracy</small><strong>{(data.confidence * 100).toFixed(1)}%</strong><p>On the last 3 known months</p></article>
              </div>
            )}
            <section className="card">
              <div className="card-head"><div><h3>Workforce demand and qualified supply</h3><p>Solid lines are observed. Dashed lines are the {data?.model.replaceAll('_', ' ') ?? 'model'} forecast with its error band.</p></div></div>
              <div className="legend"><span className="d">● Demand</span><span className="s">● Qualified supply</span></div>
              <div className="chart">
                {data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#E8DECD" strokeDasharray="3 5" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5C6465' }} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 12, fill: '#5C6465' }} tickFormatter={(v: number) => (v / 1000).toFixed(1) + 'k'} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DED5C5', fontSize: 13 }} />
                      <Area dataKey="band" stroke="none" fill="#B94220" fillOpacity={0.12} name="Demand range" />
                      <Line dataKey="demand" stroke="#B94220" strokeWidth={2.5} dot={false} name="Demand" />
                      <Line dataKey="supply" stroke="#226444" strokeWidth={2.5} dot={false} name="Supply" />
                      <Line dataKey="fDemand" stroke="#B94220" strokeWidth={2.5} strokeDasharray="6 5" dot={false} name="Demand (forecast)" />
                      <Line dataKey="fSupply" stroke="#226444" strokeWidth={2.5} strokeDasharray="6 5" dot={false} name="Supply (forecast)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <p className="muted pad">{error ? 'No data to show.' : 'Loading forecast…'}</p>}
              </div>
            </section>
          </>
        )}

        {tab === 'Forecasts' && data && (
          <section className="card pad">
            <h3>Forecast table</h3>
            <div className="table-wrap"><table><thead><tr><th>Month</th><th>Demand</th><th>Supply</th><th>Gap</th><th>Demand range</th></tr></thead>
              <tbody>{data.points.map(p => <tr key={p.month}><td>{p.month}</td><td>{fmt(p.demand)}</td><td>{fmt(p.supply)}</td><td>{fmt(p.demand - p.supply)}</td><td>{fmt(p.lower)} – {fmt(p.upper)}</td></tr>)}</tbody></table></div>
          </section>
        )}

        {tab === 'Scenarios' && session && <Scenarios token={session.token} horizon={horizon} onError={fail} />}
        {tab === 'Skills match' && session && <Skills token={session.token} onError={fail} />}

        <footer className="page-foot">© 2026 KaryaDrishti · Illustrative figures from synthetic data, not official statistics.</footer>
      </main>
    </div>
  );
}

function Scenarios({ token, horizon, onError }: { token: string; horizon: number; onError: (e: unknown) => void }) {
  const [seats, setSeats] = useState(8), [completion, setCompletion] = useState(72), [entry, setEntry] = useState(63);
  const [res, setRes] = useState<Scen | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      runScenario({ training_seats_pct: seats, completion_rate: completion / 100, job_entry_rate: entry / 100, horizon_months: horizon }, token)
        .then(r => { if (live) setRes(r); }).catch(e => { if (live) onError(e); });
    }, 250);   // debounce slider movement
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, completion, entry, horizon, token]);
  const sliders: [string, number, number, number, string, (n: number) => void][] = [
    ['Training seats', seats, 0, 25, '% increase', setSeats], ['Course completion rate', completion, 40, 100, '%', setCompletion], ['Job entry rate', entry, 30, 90, '%', setEntry]];
  return (
    <section className="card pad">
      <span className="kicker">Plan with confidence</span><h3>Policy scenario lab</h3>
      <p className="muted">Test how training and placement changes shift the projected gap at {horizon} months.</p>
      <div className="scen-grid">
        <div className="sliders">{sliders.map(([label, v, min, max, unit, set]) => (
          <label key={label}>{label}<b>{v} {unit}</b><input type="range" min={min} max={max} value={v} onChange={e => set(Number(e.target.value))} /></label>))}</div>
        <div className="result">
          {res ? <><small>Projected skills gap</small><strong>{fmt(res.projected_gap)} <span>workers</span></strong>
            <p>Baseline gap {fmt(res.baseline_gap)}. These settings add about {fmt(res.workers_added)} workers.</p></> : <p className="muted">Calculating…</p>}
        </div>
      </div>
      <p className="muted small"><ShieldCheck size={14} /> Illustrative simulation on synthetic data. It ignores timing, course capacity and cost.</p>
    </section>
  );
}

function Skills({ token, onError }: { token: string; onError: (e: unknown) => void }) {
  const [query, setQuery] = useState('Solar PV installer');
  const [cands, setCands] = useState('Welding, Solar installation, Retail operations, Python programming, Construction safety');
  const [out, setOut] = useState<Match[] | null>(null), [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { setOut((await matchSkills(query, cands.split(',').map(s => s.trim()).filter(Boolean), token)).matches); } catch (e) { onError(e); } finally { setBusy(false); }
  }
  return (
    <section className="card pad">
      <span className="kicker">Skills intelligence</span><h3>Match a job title to skills</h3>
      <p className="muted">Uses a sentence-embedding model. The first request downloads about 90 MB and can take a minute.</p>
      <div className="login-fields">
        <div className="field"><label htmlFor="q">Job title or skill</label><div className="login-input"><input id="q" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
        <div className="field"><label htmlFor="c">Candidates (comma separated)</label><div className="login-input"><input id="c" value={cands} onChange={e => setCands(e.target.value)} /></div></div>
        <button className="btn primary" onClick={() => void go()} disabled={busy || query.trim().length < 2}>{busy ? 'Matching…' : 'Match'}</button>
      </div>
      {out && <ul className="matches">{out.map(m => <li key={m.skill}><span>{m.skill}</span><i style={{ width: `${Math.max(2, m.similarity * 100)}%` }} /><b>{m.similarity.toFixed(2)}</b></li>)}</ul>}
    </section>
  );
}
