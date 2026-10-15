'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileText,
  Mail,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { str, type Row } from '@/lib/content';
import { inquiryPriorities, inquiryStatuses } from '@/lib/inquiries';
import { ConfirmDelete } from './admin-controls';
import { inquiryChanged } from './inquiry-polling';
import { inquiryDate, InquiryStatus } from './inquiry-list';
function externalHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function InquiryDetail({ initial }: { initial: Row }) {
  const router = useRouter(),
    [row, setRow] = useState(initial),
    [status, setStatus] = useState(str(initial, 'status')),
    [priority, setPriority] = useState(str(initial, 'priority')),
    [notes, setNotes] = useState(str(initial, 'admin_notes')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const attachments = (row.inquiry_attachments || []) as Row[],
    activity = (row.inquiry_activity || []) as Row[],
    email = str(row, 'email');
  async function update(patch: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/inquiries/' + row.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The change could not be saved.');
      setRow(data);
      inquiryChanged();
      setNotice('Changes saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The change could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    const response = await fetch('/api/admin/inquiries/' + row.id, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Deletion failed.');
    }
    inquiryChanged();
    router.push('/admin/inquiries');
    router.refresh();
  }
  const details = [
    ['Client name', 'full_name'],
    ['Email', 'email'],
    ['Phone', 'phone'],
    ['Preferred contact', 'preferred_contact_method'],
    ['External contact', 'external_contact'],
    ['Requested service', 'service_name_snapshot'],
    ['Project type', 'project_type'],
    ['Budget preference', 'budget_range'],
    ['Client urgency', 'urgency'],
  ] as const;
  const external = externalHref(str(row, 'external_contact'));
  return (
    <>
      <Link href="/admin/inquiries" className="text-link back-link">
        <ArrowLeft size={15} />
        All inquiries
      </Link>
      <header className="admin-title">
        <div>
          <div className="eyebrow">{str(row, 'public_reference')}</div>
          <h1>{str(row, 'project_title')}</h1>
          <p>
            Received {inquiryDate(str(row, 'created_at'))} · {row.is_read ? 'Reviewed' : 'Unread'}
            {row.is_archived ? ' · Archived' : ''}
          </p>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void update({ is_read: !row.is_read })}
          >
            <Check size={15} />
            {row.is_read ? 'Mark unread' : 'Mark reviewed'}
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void update({ is_archived: !row.is_archived })}
          >
            <Archive size={15} />
            {row.is_archived ? 'Restore' : 'Archive'}
          </button>
          <ConfirmDelete label={str(row, 'project_title')} onConfirm={remove} />
        </div>
      </header>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert success" role="status">
          {notice}
        </p>
      )}
      <div className="inquiry-detail-layout">
        <div className="inquiry-detail-main">
          <section className="admin-panel detail-panel">
            <div className="section-topline">
              <h2>Project requirements</h2>
              <InquiryStatus value={str(row, 'status')} />
            </div>
            <p className="detail-description">{str(row, 'project_description')}</p>
            {[
              ['Required features', 'required_features'],
              ['Additional notes', 'additional_notes'],
            ].map(
              ([label, key]) =>
                str(row, key) && (
                  <div className="detail-block" key={key}>
                    <h3>{label}</h3>
                    <p>{str(row, key)}</p>
                  </div>
                ),
            )}
            <div className="detail-block">
              <h3>Preferred deadline</h3>
              <p>{inquiryDate(str(row, 'preferred_deadline'))}</p>
              <small className="field-help">
                Client preferences are not a quotation or agreement.
              </small>
            </div>
          </section>
          <section className="admin-panel detail-panel">
            <h2>Client & inquiry details</h2>
            <dl className="inquiry-facts">
              {details.map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{str(row, key) || 'Not provided'}</dd>
                </div>
              ))}
            </dl>
            <div className="button-row">
              <a
                className="button secondary"
                href={
                  'mailto:' +
                  encodeURIComponent(email) +
                  '?subject=' +
                  encodeURIComponent(
                    'Re: ' + str(row, 'project_title') + ' [' + str(row, 'public_reference') + ']',
                  ) +
                  '&body=' +
                  encodeURIComponent(
                    'Hello ' +
                      str(row, 'full_name') +
                      ',\n\nThank you for your inquiry about ' +
                      str(row, 'service_name_snapshot') +
                      '.\n\n',
                  )
                }
              >
                <Mail size={15} />
                Open email draft
              </a>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(email);
                    setNotice('Email copied.');
                  } catch {
                    setError('Email could not be copied. Select it from the client details.');
                  }
                }}
              >
                <Copy size={15} />
                Copy email
              </button>
              {external && (
                <a
                  className="button secondary"
                  href={external}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open contact link
                  <ArrowUpRight size={15} />
                </a>
              )}
            </div>
            <p className="field-help">Email opens your mail app. This website does not send it.</p>
          </section>
          <section className="admin-panel detail-panel">
            <h2>
              Attachments <span className="muted">({attachments.length})</span>
            </h2>
            {attachments.length ? (
              <ul className="private-attachments">
                {attachments.map((file) => (
                  <li key={file.id}>
                    <FileText size={20} />
                    <span>
                      {str(file, 'original_filename')}
                      <small>
                        {(Number(file.file_size) / 1024).toFixed(0)} KB · {str(file, 'mime_type')}
                      </small>
                    </span>
                    <a
                      href={'/api/admin/inquiries/' + row.id + '/attachments/' + file.id}
                      className="icon-button"
                      aria-label={'Download ' + str(file, 'original_filename')}
                    >
                      <Download size={17} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No supporting files were submitted.</p>
            )}
            <p className="field-help">
              Private files · downloads require admin authorization and expire after 60 seconds.
              Inspect unfamiliar documents before opening.
            </p>
          </section>
          <section className="admin-panel detail-panel">
            <h2>Activity history</h2>
            <ol className="inquiry-activity">
              {activity.map((item) => (
                <li key={item.id}>
                  <span className="activity-dot" />
                  <div>
                    <h3>{str(item, 'action')}</h3>
                    {str(item, 'new_status') && (
                      <p>
                        {str(item, 'previous_status') ? str(item, 'previous_status') + ' → ' : ''}
                        {str(item, 'new_status')}
                      </p>
                    )}
                    <small>
                      {str(item, 'actor_name') || 'System'} · {inquiryDate(str(item, 'created_at'))}{' '}
                      {new Date(str(item, 'created_at')).toLocaleTimeString('en', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Manila',
                      })}{' '}
                      PHT
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            <p className="field-help">Showing the latest 100 events.</p>
          </section>
        </div>
        <aside className="inquiry-detail-side">
          <form
            className="admin-panel detail-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void update({ status, priority, admin_notes: notes });
            }}
          >
            <span className="eyebrow">MANAGE THIS INQUIRY</span>
            <h2>Keep things moving.</h2>
            <label className="field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={busy}
              >
                {inquiryStatuses.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Admin priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={busy}
              >
                {inquiryPriorities.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <span className="field-help">Independent of the client’s requested urgency.</span>
            </label>
            <label className="field">
              <span>Internal notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={10000}
                rows={7}
                disabled={busy}
                placeholder="Context, next steps, and conversation notes…"
              />
              <span className="field-help">Private. Never included in a public response.</span>
            </label>
            <button className="button primary" type="submit" disabled={busy}>
              <Save size={16} />
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
          <div className="detail-privacy">
            <ShieldCheck size={18} />
            <p>
              Consent recorded {inquiryDate(str(row, 'privacy_consent_at'))}. Notice version{' '}
              {str(row, 'privacy_notice_version')}. Review closed inquiries regularly and delete
              personal data when no longer needed.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
