'use client';
import Script from 'next/script';
import { useCallback, useEffect, useRef } from 'react';
type Turnstile = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
export function SpamVerification({
  siteKey,
  onChange,
  onError,
  resetKey,
}: {
  siteKey: string;
  onChange: (token: string) => void;
  onError: (message: string) => void;
  resetKey: number;
}) {
  const node = useRef<HTMLDivElement>(null),
    id = useRef<string | null>(null);
  const callbacks = useRef({ onChange, onError });
  useEffect(() => {
    callbacks.current = { onChange, onError };
  }, [onChange, onError]);
  const api = () => (window as typeof window & { turnstile?: Turnstile }).turnstile;
  const render = useCallback(() => {
    if (node.current && !id.current)
      id.current =
        api()?.render(node.current, {
          sitekey: siteKey,
          action: 'inquiry',
          theme: 'auto',
          size: 'compact',
          callback: (value: string) => callbacks.current.onChange(value),
          'expired-callback': () => callbacks.current.onChange(''),
          'error-callback': () => {
            callbacks.current.onChange('');
            callbacks.current.onError(
              'Verification could not load. Please retry or use the contact links.',
            );
          },
        }) || null;
  }, [siteKey]);
  useEffect(() => {
    render();
    return () => {
      if (id.current) api()?.remove(id.current);
      id.current = null;
    };
  }, [render, resetKey]);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
      />
      <div ref={node} className="spam-widget" aria-label="Spam protection" />
    </>
  );
}
