'use client';
import { useState } from 'react';
import { Archive, ArchiveRestore, Mail, MailOpen } from 'lucide-react';
import { type Row, str } from '@/lib/content';
import { apiResult } from '@/lib/admin-data';
import { ConfirmDelete } from './admin-controls';
import { EmptyState } from './public';
export function MessageManager({
  initialRows,
  initialCount,
}: {
  initialRows: Row[];
  initialCount: number;
}) {
  const [rows, setRows] = useState(initialRows),
    [count, setCount] = useState(initialCount),
    [filter, setFilter] = useState('inbox'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load(nextFilter = filter, nextPage = page) {
    const result = await apiResult(
      await fetch(`/api/admin/messages?filter=${nextFilter}&page=${nextPage}`, {
        cache: 'no-store',
      }),
    );
    setRows(result.rows);
    setCount(result.count);
    setFilter(nextFilter);
    setPage(nextPage);
  }
  async function update(row: Row, data: Record<string, boolean>) {
    setBusy(true);
    setError('');
    try {
      await apiResult(
        await fetch('/api/admin/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id, ...data }),
        }),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }
  async function refresh(nextFilter: string, nextPage: number) {
    setBusy(true);
    setError('');
    try {
      await load(nextFilter, nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Messages could not be loaded.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="admin-title">
        <div>
          <div className="eyebrow">PRIVATE CORRESPONDENCE</div>
          <h1>Messages</h1>
          <p>{count} messages in this view. Only authorized administrators can read them.</p>
        </div>
      </header>
      <div className="manager-toolbar">
        <label className="filter-select">
          <span className="sr-only">Filter messages</span>
          <select value={filter} disabled={busy} onChange={(e) => void refresh(e.target.value, 0)}>
            <option value="inbox">Inbox</option>
            <option value="unread">Unread</option>
            <option value="archived">Archived</option>
            <option value="all">All messages</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {rows.length ? (
        <div className="admin-panel">
          {rows.map((row) => (
            <article key={row.id}>
              <div className="content-row">
                <div>
                  <button
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      textAlign: 'left',
                      color: 'inherit',
                    }}
                    aria-expanded={selected === row.id}
                    onClick={() => {
                      setSelected(selected === row.id ? '' : row.id);
                    }}
                  >
                    <h2>{str(row, 'subject')}</h2>
                  </button>
                  <p>
                    {str(row, 'full_name')} ·{' '}
                    {new Date(str(row, 'created_at')).toLocaleDateString('en', { timeZone: 'UTC' })}
                  </p>
                  {!row.is_read && <span className="badge unread">Unread</span>}
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={row.is_read ? 'Mark unread' : 'Mark read'}
                    onClick={() => void update(row, { is_read: !row.is_read })}
                  >
                    {row.is_read ? <Mail size={15} /> : <MailOpen size={15} />}
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={row.is_archived ? 'Restore message' : 'Archive message'}
                    onClick={() => void update(row, { is_archived: !row.is_archived })}
                  >
                    {row.is_archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>
                  <ConfirmDelete
                    label={str(row, 'subject')}
                    onConfirm={async () => {
                      await apiResult(
                        await fetch(`/api/admin/messages?id=${row.id}`, { method: 'DELETE' }),
                      );
                      await load();
                    }}
                  />
                </div>
              </div>
              {selected === row.id && (
                <div className="message-detail">
                  <a href={`mailto:${str(row, 'email')}`}>{str(row, 'email')}</a>
                  <p>{str(row, 'message')}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          title="A quiet inbox."
          description="Contact form messages will appear here when they arrive."
        />
      )}
      <div className="pagination">
        {page > 0 && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void refresh(filter, page - 1)}
          >
            Previous
          </button>
        )}
        {(page + 1) * 30 < count && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void refresh(filter, page + 1)}
          >
            Next
          </button>
        )}
      </div>
    </>
  );
}
