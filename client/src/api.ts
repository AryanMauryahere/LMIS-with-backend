export type Role = 'planner' | 'officer' | 'analyst';
export interface Session { token: string; role: Role; name: string }
export interface Pt { month: string; demand: number; supply: number }
export interface FPt extends Pt { lower: number; upper: number }
export interface Forecast { model: string; confidence: number; points: FPt[]; history: Pt[]; synthetic: boolean }
export interface Scen { baseline_gap: number; projected_gap: number; workers_added: number; confidence: number }
export interface Match { skill: string; similarity: number }

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch('/api/v1' + path, { ...init, headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Make sure the backend is running on port 8000.');
  }
  if (!r.ok) {
    let msg = r.statusText;
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep status text */ }
    throw new ApiError(r.status, msg);
  }
  return r.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const toSession = (t: { access_token: string; role: Role; name: string }): Session => ({ token: t.access_token, role: t.role, name: t.name });

export const login = async (email: string, password: string) =>
  toSession(await req('/auth/token', { method: 'POST', body: new URLSearchParams({ username: email, password }) }));
export const demoLogin = async (role: Role) => toSession(await req('/auth/demo', json({ role })));
export const getForecast = (h: number, model: 'holt' | 'arima', token?: string) =>
  token ? req<Forecast>('/forecasts', json({ horizon_months: h, model }), token) : req<Forecast>(`/public/forecast?horizon_months=${h}`);
export const runScenario = (b: { training_seats_pct: number; completion_rate: number; job_entry_rate: number; horizon_months: number }, token: string) =>
  req<Scen>('/scenarios', json(b), token);
export const matchSkills = (query: string, candidates: string[], token: string) =>
  req<{ matches: Match[]; model: string }>('/skills/match', json({ query, candidates }), token);
