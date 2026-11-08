'use client';

import { useState } from 'react';
import { IconLock } from '@/components/icons';

export default function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Could not sign in');
      window.location.assign(next);
    } catch (problem: any) {
      setError(problem.message ?? 'Could not sign in');
      setBusy(false);
    }
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="login-field">
        <span className="mono">password</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </label>

      {error ? <p className="login-error">{error}</p> : null}

      <button type="submit" className="btn btn-primary login-submit" disabled={busy || !password}>
        <IconLock size={15} />
        {busy ? 'Unlocking …' : 'Unlock'}
      </button>
    </form>
  );
}
