'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { contactSchema } from '@/lib/content';
type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
export function ContactForm({ siteKey }: { siteKey?: string }) {
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  function turnstile() {
    return (window as typeof window & { turnstile?: Turnstile }).turnstile;
  }
  useEffect(
    () => () => {
      if (widgetId.current) turnstile()?.remove(widgetId.current);
      widgetId.current = null;
    },
    [],
  );
  function loadWidget() {
    if (widget.current && !widgetId.current)
      widgetId.current =
        turnstile()?.render(widget.current, {
          sitekey: siteKey,
          action: 'contact',
          theme: 'auto',
          size: 'compact',
          callback: (value: string) => setToken(value),
          'expired-callback': () => setToken(''),
          'error-callback': () => {
            setToken('');
            setError('Verification could not load. Please refresh or use the contact links.');
          },
        }) || null;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFields({});
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    const parsed = contactSchema.safeParse({ ...raw, token });
    if (!parsed.success) {
      const next: Record<string, string[]> = {};
      parsed.error.issues.forEach((i) => {
        const key = String(i.path[0]);
        next[key] = [i.message];
      });
      setFields(next);
      setError('Please check your fields and complete verification.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSent(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be sent. Please try again.');
    } finally {
      setBusy(false);
      setToken('');
      if (widgetId.current) turnstile()?.reset(widgetId.current);
    }
  }
  if (sent)
    return (
      <div className="contact-success" role="status">
        <CheckCircle2 size={40} />
        <h2>Message received.</h2>
        <p>Thank you for reaching out. Your message has been saved securely.</p>
        <button
          className="button secondary"
          onClick={() => {
            setSent(false);
            widgetId.current = null;
          }}
        >
          Send another message
        </button>
      </div>
    );
  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        {[
          {
            key: 'full_name',
            label: 'Full name',
            type: 'text',
            placeholder: 'Your name',
            max: 100,
          },
          {
            key: 'email',
            label: 'Email address',
            type: 'email',
            placeholder: 'you@example.com',
            max: 254,
          },
          {
            key: 'subject',
            label: 'What’s on your mind?',
            type: 'text',
            placeholder: 'A project, a question, a hello…',
            max: 180,
          },
        ].map((f) => (
          <label className={`field ${f.key === 'subject' ? 'full-width' : ''}`} key={f.key}>
            <span>
              {f.label} <span className="accent">*</span>
            </span>
            <input
              name={f.key}
              type={f.type}
              autoComplete={
                f.key === 'full_name' ? 'name' : f.key === 'email' ? 'email' : undefined
              }
              placeholder={f.placeholder}
              required
              maxLength={f.max}
              aria-invalid={!!fields[f.key]}
              aria-describedby={fields[f.key] ? `${f.key}-error` : undefined}
            />
            {fields[f.key] && (
              <span id={`${f.key}-error`} className="field-error">
                {fields[f.key][0]}
              </span>
            )}
          </label>
        ))}
      </div>
      <label className="field">
        <span>
          Your message <span className="accent">*</span>
        </span>
        <textarea
          name="message"
          rows={6}
          placeholder="Tell me a little about it…"
          required
          minLength={10}
          maxLength={5000}
          aria-invalid={!!fields.message}
          aria-describedby={fields.message ? 'message-error' : undefined}
        />
        {fields.message && (
          <span id="message-error" className="field-error">
            {fields.message[0]}
          </span>
        )}
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave this field empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {siteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            onReady={loadWidget}
          />
          <div ref={widget} aria-label="Spam protection" />
          {fields.token && <p className="field-error">Please complete the verification.</p>}
        </>
      ) : (
        <p className="form-note">
          The contact form is being configured. Please use any available contact links.
        </p>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <div className="form-submit">
        <p>
          Your details are used only to respond
          <br />
          to your message.
        </p>
        <button className="button primary" disabled={busy || !siteKey} type="submit">
          {busy ? (
            <>
              <Loader2 className="spin" size={17} />
              Sending…
            </>
          ) : (
            <>
              Send message
              <ArrowUpRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
