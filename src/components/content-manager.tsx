'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Search, Star } from 'lucide-react';
import { entities, str, type Entity, type Row } from '@/lib/content';
import { apiResult, formValues } from '@/lib/admin-data';
import { EmptyState } from './public';
import { ConfirmDelete } from './admin-controls';
export function ContentManager({
  entity,
  initialRows,
  initialCount,
  saved = false,
}: {
  entity: Entity;
  initialRows: Row[];
  initialCount: number;
  saved?: boolean;
}) {
  const config = entities[entity];
  const [rows, setRows] = useState(initialRows),
    [count, setCount] = useState(initialCount),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(
      saved
        ? 'Changes saved. The public portfolio will reflect published content on its next page load.'
        : '',
    );
  async function load(nextPage = page) {
    const result = await apiResult(
      await fetch(
        `/api/admin/content/${entity}?${new URLSearchParams({ search, page: String(nextPage) })}`,
        { cache: 'no-store' },
      ),
    );
    setRows(result.rows);
    setCount(result.count);
    setPage(nextPage);
  }
  async function refresh(nextPage = page) {
    setBusy(true);
    setError('');
    try {
      await load(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Content could not be loaded.');
    } finally {
      setBusy(false);
    }
  }
  async function change(row: Row, key: string, value: boolean) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await apiResult(
        await fetch(`/api/admin/content/${entity}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id, data: { ...formValues(entity, row), [key]: value } }),
        }),
      );
      await load();
      setNotice('Content updated. Refresh the public page to see the change.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: Row) {
    await apiResult(await fetch(`/api/admin/content/${entity}?id=${row.id}`, { method: 'DELETE' }));
    await load(rows.length === 1 && page > 0 ? page - 1 : page);
    setNotice('Content deleted.');
  }
  return (
    <>
      <header className="admin-title">
        <div>
          <div className="eyebrow">MANAGE YOUR PORTFOLIO</div>
          <h1>{config.label}</h1>
          <p>
            {count} {count === 1 ? 'item' : 'items'} · Published content appears on your public
            portfolio.
          </p>
        </div>
        <Link className="button primary" href={`/admin/${entity}/new`}>
          <Plus size={16} />
          Add {config.singular}
        </Link>
      </header>
      {notice && (
        <p className="alert success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <form
        className="manager-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void refresh(0);
        }}
      >
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Search {config.label.toLowerCase()}</span>
          <input
            type="search"
            placeholder={`Search ${config.label.toLowerCase()}…`}
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="button secondary" disabled={busy} type="submit">
          {busy ? 'Loading…' : 'Search'}
        </button>
      </form>
      {rows.length ? (
        <div className="admin-panel" role="table" aria-label={config.label} aria-busy={busy}>
          <div className="content-table-header" role="row">
            <span role="columnheader">CONTENT</span>
            <span role="columnheader">STATUS</span>
            <span role="columnheader" className="date-label">
              UPDATED
            </span>
            <span role="columnheader">ACTIONS</span>
          </div>
          {rows.map((row) => {
            const label = str(row, 'title') || str(row, 'name') || str(row, 'label');
            return (
              <article className="content-row content-table-row" role="row" key={row.id}>
                <div role="cell">
                  <h2>
                    <Link href={`/admin/${entity}/${row.id}`}>{label}</Link>
                  </h2>
                  <p>
                    {str(row, 'short_description') ||
                      str(row, 'organization') ||
                      str(row, 'institution') ||
                      str(row, 'url') ||
                      'Ready to edit'}
                  </p>
                </div>
                <div role="cell" className="row-status">
                  <span className={`badge ${row.is_published ? 'published' : ''}`}>
                    {row.is_published ? 'Published' : 'Draft / hidden'}
                  </span>
                </div>
                <div role="cell" className="row-date">
                  {str(row, 'updated_at')
                    ? new Date(str(row, 'updated_at')).toLocaleDateString('en', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })
                    : '—'}
                </div>
                <div className="row-actions" role="cell">
                  {entity === 'projects' && (
                    <button
                      type="button"
                      className="icon-button"
                      disabled={busy}
                      aria-label={
                        row.is_featured ? `Remove ${label} from featured` : `Feature ${label}`
                      }
                      onClick={() => void change(row, 'is_featured', !row.is_featured)}
                    >
                      <Star size={15} fill={row.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-button"
                    disabled={busy}
                    aria-label={`${row.is_published ? 'Unpublish' : 'Publish'} ${label}`}
                    onClick={() => void change(row, 'is_published', !row.is_published)}
                  >
                    {row.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <Link
                    className="icon-button"
                    aria-label={`Edit ${label}`}
                    href={`/admin/${entity}/${row.id}`}
                  >
                    <Pencil size={15} />
                  </Link>
                  <ConfirmDelete label={label} onConfirm={() => remove(row)} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          compact
          title={search ? 'No matching content.' : `Your first ${config.singular} starts here.`}
          description={
            search
              ? 'Try a different search.'
              : `Add real information and publish when it’s ready. Drafts stay private.`
          }
        />
      )}
      {rows.length > 0 && (
        <p className="manager-count">
          Showing {rows.length} of {count} {count === 1 ? 'item' : 'items'}
        </p>
      )}
      <div className="pagination">
        {page > 0 && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void refresh(page - 1)}
          >
            Previous
          </button>
        )}
        {(page + 1) * 30 < count && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void refresh(page + 1)}
          >
            Next
          </button>
        )}
      </div>
    </>
  );
}
