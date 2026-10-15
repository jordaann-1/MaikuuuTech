'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, RefreshCw, Search } from 'lucide-react';
import { str, type Row } from '@/lib/content';
import {
  inquiryFiltersSchema,
  inquiryPriorities,
  inquiryStatuses,
  type InquiryFilters,
} from '@/lib/inquiries';
import { usePrivatePolling } from './inquiry-polling';
export const inquiryDate = (value: string) =>
  value
    ? new Date(value.length === 10 ? value + 'T00:00:00Z' : value).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      })
    : 'Not specified';
export function InquiryStatus({ value, priority = false }: { value: string; priority?: boolean }) {
  return (
    <span
      className={
        'status-pill ' +
        (priority ? 'priority-' : 'status-') +
        value.toLowerCase().replaceAll(' ', '-')
      }
    >
      {value}
    </span>
  );
}
export function InquiryList({
  initial,
  initialFilters,
  services,
}: {
  initial: { rows: Row[]; count: number };
  initialFilters: InquiryFilters;
  services: Row[];
}) {
  const [filters, setFilters] = useState(initialFilters),
    [filterError, setFilterError] = useState('');
  const state = usePrivatePolling<{ rows: Row[]; count: number }>(
    '/api/admin/inquiries?' +
      new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)])),
    initial,
    30000,
  );
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = inquiryFiltersSchema.safeParse({
      ...Object.fromEntries(new FormData(event.currentTarget)),
      page: 0,
    });
    if (!parsed.success) {
      setFilterError('Choose a valid date range.');
      return;
    }
    setFilterError('');
    setFilters(parsed.data);
  }
  return (
    <>
      <header className="admin-title">
        <div>
          <div className="eyebrow">CLIENT WORKSPACE</div>
          <h1>
            Client inquiries<span className="accent">.</span>
          </h1>
          <p>A clear view of every conversation and what comes next.</p>
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={state.loading}
          onClick={state.refresh}
        >
          <RefreshCw className={state.loading ? 'spin' : ''} size={15} />
          Refresh
        </button>
      </header>
      <form className="inquiry-filters admin-panel" onSubmit={apply} aria-label="Filter inquiries">
        <label className="field filter-search">
          <span>Search inquiries</span>
          <div className="search-field">
            <Search size={16} />
            <input
              name="search"
              maxLength={100}
              defaultValue={initialFilters.search}
              placeholder="Name, email, title, or reference"
            />
          </div>
        </label>
        {(
          [
            {
              name: 'service',
              label: 'Service',
              items: services.map((row) => ({ value: row.id, label: str(row, 'title') })),
            },
            {
              name: 'status',
              label: 'Status',
              items: inquiryStatuses.map((value) => ({ value, label: value })),
            },
            {
              name: 'priority',
              label: 'Priority',
              items: inquiryPriorities.map((value) => ({ value, label: value })),
            },
          ] as const
        ).map((field) => (
          <label className="field" key={field.name}>
            <span>{field.label}</span>
            <select name={field.name} defaultValue={initialFilters[field.name]}>
              <option value="">All {field.label.toLowerCase()}s</option>
              {field.items.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="field">
          <span>From date</span>
          <input type="date" name="from" defaultValue={initialFilters.from} />
        </label>
        <label className="field">
          <span>To date</span>
          <input type="date" name="to" defaultValue={initialFilters.to} />
        </label>
        <label className="field">
          <span>Sort order</span>
          <select name="sort" defaultValue={initialFilters.sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <label className="field">
          <span>Archive</span>
          <select name="archive" defaultValue={initialFilters.archive}>
            <option value="active">Active inquiries</option>
            <option value="archived">Archived inquiries</option>
            <option value="all">All inquiries</option>
          </select>
        </label>
        <button className="button primary" type="submit">
          Apply filters
        </button>
      </form>
      {filterError && (
        <p className="alert error" role="alert">
          {filterError}
        </p>
      )}
      {state.error && (
        <p className="alert error" role="alert">
          {state.error} Your last loaded results are kept.
        </p>
      )}
      <div className="inquiry-results" aria-busy={state.loading}>
        <div className="results-topline">
          <span>{state.data?.count || 0} inquiries</span>
          <span className="field-help">Auto-refresh · 30 seconds while visible</span>
        </div>
        {state.data?.rows.length ? (
          <>
            <div className="inquiry-table-head" aria-hidden="true">
              <span>Client / project</span>
              <span>Service / budget</span>
              <span>Deadline / received</span>
              <span>Status / priority</span>
              <span />
            </div>
            <div className="inquiry-rows">
              {state.data.rows.map((row) => (
                <article className={'inquiry-row ' + (!row.is_read ? 'unread' : '')} key={row.id}>
                  <div className="inquiry-client">
                    <span className="table-eyebrow">
                      {!row.is_read && <span className="unread-dot" />}
                      {str(row, 'public_reference')}
                    </span>
                    <Link href={'/admin/inquiries/' + row.id}>
                      <h2>{str(row, 'project_title')}</h2>
                    </Link>
                    <p>
                      {str(row, 'full_name')} · {str(row, 'email')}
                    </p>
                  </div>
                  <div>
                    <span className="mobile-field-label">Service / budget</span>
                    <p>{str(row, 'service_name_snapshot')}</p>
                    <small>{str(row, 'budget_range')}</small>
                  </div>
                  <div>
                    <span className="mobile-field-label">Deadline / received</span>
                    <p>{inquiryDate(str(row, 'preferred_deadline'))}</p>
                    <small>Received {inquiryDate(str(row, 'created_at'))}</small>
                  </div>
                  <div className="inquiry-badges">
                    <InquiryStatus value={str(row, 'status')} />
                    <InquiryStatus value={str(row, 'priority')} priority />
                  </div>
                  <Link
                    className="icon-button"
                    href={'/admin/inquiries/' + row.id}
                    aria-label={'View ' + str(row, 'project_title')}
                  >
                    <ArrowRight size={17} />
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="inquiry-empty admin-panel">
            <Inbox size={28} />
            <h2>No inquiries in this view.</h2>
            <p>New submissions will appear automatically. Try adjusting your filters.</p>
          </div>
        )}
        <div className="pagination">
          <button
            className="button secondary"
            disabled={filters.page === 0 || state.loading}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            <ChevronLeft size={15} />
            Previous
          </button>
          <span>
            Page {filters.page + 1} of {Math.max(1, Math.ceil((state.data?.count || 0) / 20))}
          </span>
          <button
            className="button secondary"
            disabled={(filters.page + 1) * 20 >= (state.data?.count || 0) || state.loading}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
