import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Landmark, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { login, demoLogin } from './api';
import type { Role, Session } from './api';

const DEMOS: { role: Role; initials: string; name: string; desc: string }[] = [
  { role: 'planner', initials: 'PP', name: 'Policy Planner', desc: 'Forecasts, seat scenarios, policy brief' },
  { role: 'officer', initials: 'DO', name: 'Data Officer', desc: 'Data intake and validation' },
  { role: 'analyst', initials: 'SA', name: 'Skill Analyst', desc: 'Skill mapping and forecast evidence' },
];

export default function Login({ onSession, onPublic }: { onSession: (s: Session) => void; onPublic: () => void }) {
  const [mode, setMode] = useState<'staff' | 'public'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<Session>) {
    setBusy(true); setError('');
    try { onSession(await fn()); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void run(() => login(email, password)); };

  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-story" aria-label="About KaryaDrishti">
          <div className="login-brand">
            <img src="/KaryaDrishti_Logo.png" alt="" />
            <div><strong>KaryaDrishti</strong><span>Labour market intelligence</span></div>
          </div>
          <h1>See the workforce.<br />Plan the skills.<br />Act before the gap.</h1>
          <p>Forecast district-level job demand against qualified training supply, spot shortages early and test training-seat scenarios.</p>
          <div className="login-illustration" role="img" aria-label="A person using a laptop to explore labour market data." />
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <span className="kicker">Your workspace. Your role.</span>
          <h2 id="login-title">Welcome to KaryaDrishti</h2>
          <p className="login-intro">{mode === 'staff' ? 'Sign in to open forecasts, scenarios and skill mapping for your role.' : 'Browse the read-only forecast. No account needed.'}</p>

          <div className="login-roles" role="group" aria-label="Access type">
            <button type="button" aria-pressed={mode === 'staff'} onClick={() => { setMode('staff'); setError(''); }}><Landmark size={20} />Staff login</button>
            <button type="button" aria-pressed={mode === 'public'} onClick={() => { setMode('public'); setError(''); }}><UserRound size={20} />Public view</button>
          </div>

          {mode === 'staff' ? (
            <>
              <form onSubmit={submit} className="login-fields">
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <div className="login-input"><Mail size={19} /><input id="email" type="email" autoComplete="username" required placeholder="planner@karyadrishti.in" value={email} onChange={e => setEmail(e.target.value)} /></div>
                </div>
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="login-input">
                    <LockKeyhole size={19} />
                    <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                  </div>
                </div>
                {error && <div className="note error" role="alert">{error}</div>}
                <button className="btn primary login-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Sign in'}<ArrowRight size={19} /></button>
              </form>

              <section className="demo" aria-labelledby="demo-title">
                <div className="demo-divider"><span id="demo-title">Or continue as a demo role</span></div>
                <div className="demo-grid">
                  {DEMOS.map((d, i) => (
                    <button type="button" key={d.role} className={`demo-card tone-${i}`} disabled={busy} onClick={() => void run(() => demoLogin(d.role))} aria-label={`Continue as ${d.name}`}>
                      <span className="demo-avatar" aria-hidden="true">{d.initials}</span>
                      <span className="demo-copy"><strong>{d.name}</strong><small>{d.desc}</small></span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <p className="muted small">Demo roles use synthetic data and need no password.</p>
              </section>
            </>
          ) : (
            <div className="public-box">
              <ShieldCheck size={22} />
              <p>The public view shows the same synthetic forecast without scenario controls or staff tools.</p>
              <button className="btn primary login-submit" onClick={onPublic}>Open public view<ArrowRight size={19} /></button>
            </div>
          )}
        </section>
      </div>
      <footer className="login-footer"><span>KaryaDrishti · Smart India Hackathon 2026 prototype</span><span>Demonstration data only</span></footer>
    </main>
  );
}
