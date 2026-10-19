import { useState } from 'react';
import type { Session } from './api';
import Login from './Login';
import Dashboard from './Dashboard';

const KEY = 'kd_session';
function stored(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Session | null; } catch { return null; }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(stored);
  const [isPublic, setPublic] = useState(false);
  const save = (s: Session | null) => {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY);
    setSession(s);
  };
  if (session) return <Dashboard session={session} onLogout={() => save(null)} />;
  if (isPublic) return <Dashboard session={null} onLogout={() => setPublic(false)} />;
  return <Login onSession={save} onPublic={() => setPublic(true)} />;
}
