'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
export function AuthForm({
  configured,
  mode = 'login',
  expired = false,
}: {
  configured: boolean;
  mode?: 'login' | 'password';
  expired?: boolean;
}) {
  const router = useRouter();
  const [recover, setRecover] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(
      expired ? 'This recovery link has expired or is invalid. Request a new link.' : '',
    ),
    [success, setSuccess] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const action = mode === 'password' ? 'password' : recover ? 'recover' : 'login';
    if (mode === 'password' && data.password !== data.confirm) {
      setError('The passwords do not match.');
      setBusy(false);
      return;
    }
    delete data.confirm;
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (action === 'recover')
        setSuccess('If the account exists, a recovery link will be sent. Check your inbox.');
      else {
        router.push(action === 'password' ? '/admin/login' : '/admin');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete this request.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <div className="eyebrow" style={{ marginBottom: 15 }}>
        PRIVATE WORKSPACE
      </div>
      <h2>
        {mode === 'password'
          ? 'A fresh start.'
          : recover
            ? 'Reset your password.'
            : 'Welcome back.'}
      </h2>
      <p>
        {mode === 'password'
          ? 'Choose a new password of at least 12 characters.'
          : recover
            ? 'Enter your administrator email to receive a recovery link.'
            : 'Sign in to manage your portfolio.'}
      </p>
      {!configured && (
        <div className="alert info">
          <strong>Supabase setup required.</strong>
          <br />
          Add your project URL and publishable key to <code>.env.local</code>, apply the migration,
          and create your administrator. See README.md.
        </div>
      )}
      <form onSubmit={submit}>
        {mode === 'login' && (
          <label className="field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
        )}
        {!recover && (
          <label className="field">
            <span>{mode === 'password' ? 'New password' : 'Password'}</span>
            <input
              name="password"
              type="password"
              autoComplete={mode === 'password' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'password' ? 12 : 1}
              maxLength={128}
            />
          </label>
        )}
        {mode === 'password' && (
          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
        )}
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="alert success" role="status">
            {success}
          </p>
        )}
        <button className="button primary" type="submit" disabled={busy || !configured}>
          {busy ? (
            <Loader2 size={17} className="spin" />
          ) : mode === 'password' ? (
            'Update password'
          ) : recover ? (
            'Send recovery link'
          ) : (
            'Sign in'
          )}
          {!busy && <ArrowRight size={17} />}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/">← Back to portfolio</Link>
        {mode === 'login' && (
          <button
            onClick={() => {
              setRecover(!recover);
              setError('');
              setSuccess('');
            }}
          >
            {recover ? 'Back to sign in' : 'Forgot password?'}
          </button>
        )}
      </div>
    </div>
  );
}
