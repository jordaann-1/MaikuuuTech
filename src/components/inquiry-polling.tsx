'use client';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ArrowUpRight, Inbox, RefreshCw } from 'lucide-react';
import { str, type Row } from '@/lib/content';
export function inquiryChanged() {
  window.dispatchEvent(new Event('inquiries-changed'));
}
export function usePrivatePolling<T>(url: string, initial?: T, interval = 60000) {
  const [data, setData] = useState<T | undefined>(initial),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(!initial),
    [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      controller: AbortController | undefined,
      failures = 0,
      running = false;
    async function poll() {
      if (stopped || document.hidden || running) return;
      running = true;
      controller = new AbortController();
      setLoading(true);
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' }),
          result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not refresh inquiries.');
        if (!stopped) {
          setData(result);
          setError('');
          failures = 0;
        }
      } catch (e) {
        if (!stopped && !(e instanceof Error && e.name === 'AbortError')) {
          setError(e instanceof Error ? e.message : 'Could not refresh inquiries.');
          failures++;
        }
      } finally {
        running = false;
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(poll, Math.min(300000, interval * 2 ** failures));
        }
      }
    }
    function wake() {
      if (timer) clearTimeout(timer);
      if (!document.hidden) void poll();
      else controller?.abort();
    }
    void poll();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('inquiries-changed', wake);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('inquiries-changed', wake);
    };
  }, [url, interval, version]);
  return { data, error, loading, refresh };
}
type Summary = { counts: Record<string, number>; recent: Row[] };
const InquiryContext = createContext<ReturnType<typeof usePrivatePolling<Summary>> | null>(null);
export function InquiryProvider({ children }: { children: React.ReactNode }) {
  const state = usePrivatePolling<Summary>('/api/admin/inquiries/summary');
  return <InquiryContext.Provider value={state}>{children}</InquiryContext.Provider>;
}
export function InquiryBadge() {
  const state = useContext(InquiryContext);
  const unread = state?.data?.counts.unread;
  return unread ? (
    <span className="notification-badge" aria-label={unread + ' unread inquiries'}>
      {unread > 99 ? '99+' : unread}
    </span>
  ) : null;
}
export function InquiryOverview() {
  const state = useContext(InquiryContext);
  if (!state) return null;
  return (
    <section className="dashboard-section inquiry-overview">
      <div className="section-topline">
        <div>
          <span className="eyebrow">CLIENT WORKSPACE</span>
          <h2>Conversations into projects.</h2>
        </div>
        <Link href="/admin/inquiries" className="text-link">
          All inquiries
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {state.error && (
        <p className="alert error" role="alert">
          {state.error}
          <button type="button" className="text-link" onClick={state.refresh}>
            Retry
          </button>
        </p>
      )}
      {state.data ? (
        <>
          <div className="stats-grid inquiry-stats">
            {[
              ['total', 'Total inquiries'],
              ['new', 'New inquiries'],
              ['in_progress', 'In progress'],
              ['awaiting_client', 'Awaiting client'],
              ['completed', 'Completed'],
              ['declined', 'Declined'],
            ].map(([key, label]) => (
              <div className="stat-card" key={key}>
                <span>{label}</span>
                <strong>{state.data!.counts[key]}</strong>
              </div>
            ))}
          </div>
          <div className="admin-panel">
            {state.data.recent.length ? (
              state.data.recent.map((row) => (
                <Link className="content-row" key={row.id} href={'/admin/inquiries/' + row.id}>
                  <div>
                    <span className="table-eyebrow">
                      {!row.is_read && <span className="unread-dot" />}
                      {str(row, 'status')}
                    </span>
                    <h3>{str(row, 'project_title')}</h3>
                    <p>
                      {str(row, 'full_name')} · {str(row, 'service_name_snapshot')}
                    </p>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <div className="inquiry-empty">
                <Inbox size={24} />
                <h3>Ready for the next conversation.</h3>
                <p>Submitted inquiries will appear here.</p>
              </div>
            )}
          </div>
          <p className="field-help">
            {state.data.counts.unread} unread · Refreshes every minute while this tab is visible.
            Archived inquiries are excluded from active counts.
          </p>
        </>
      ) : (
        !state.error && (
          <p className="form-note">
            <RefreshCw className="spin" size={15} /> Loading inquiry statistics…
          </p>
        )
      )}
    </section>
  );
}
