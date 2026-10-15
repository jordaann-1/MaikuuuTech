import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  Code2,
  FilePenLine,
  FolderKanban,
  Mail,
  MailOpen,
  Radio,
} from 'lucide-react';
import { str, type Row } from '@/lib/content';
import { EmptyState } from './public';
import { InquiryOverview } from './inquiry-polling';
export function DashboardOverview({
  name,
  counts,
  recent,
}: {
  name: string;
  counts: number[];
  recent: Row[];
}) {
  const stats = [
    ['Published projects', FolderKanban],
    ['Draft projects', FilePenLine],
    ['Skills', Code2],
    ['Certificates', Award],
    ['Total messages', Mail],
    ['Unread messages', MailOpen],
  ] as const;
  return (
    <>
      <header className="admin-title">
        <div>
          <div className="eyebrow">WORKSPACE OVERVIEW</div>
          <h1>
            Welcome back, {name}
            <span className="accent">.</span>
          </h1>
          <p>Your work, your story. Keep it moving forward.</p>
        </div>
        <Link href="/admin/projects/new" className="button primary">
          Add project
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <div className="stats-grid">
        {stats.map(([label, Icon], index) => (
          <div className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={16} />
            </div>
            <strong>{counts[index] ?? 0}</strong>
          </div>
        ))}
      </div>
      <InquiryOverview />
      <div className="dashboard-split dashboard-section">
        <section>
          <h2 className="dashboard-subtitle">Recently updated</h2>
          {recent.length ? (
            <div className="admin-panel">
              {recent.map((row) => (
                <Link
                  className="content-row"
                  href={'/admin/' + str(row, 'entity') + '/' + row.id}
                  key={str(row, 'entity') + row.id}
                >
                  <div>
                    <h3>
                      {str(row, 'title') ||
                        str(row, 'name') ||
                        str(row, 'label') ||
                        'Site settings'}
                    </h3>
                    <p>
                      {str(row, 'entity')} ·{' '}
                      {new Date(str(row, 'updated_at')).toLocaleDateString('en', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </p>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="A fresh canvas."
              description="Your most recent content updates will appear here."
            />
          )}
        </section>
        <aside className="dashboard-note">
          <Radio size={25} strokeWidth={1.3} />
          <h2>
            Publish. Refresh.
            <br />
            There it is.
          </h2>
          <p>
            Save your changes and open the public portfolio to see published content. Everyday
            updates need no new deployment.
          </p>
          <Link href="/" target="_blank" className="text-link">
            View portfolio
            <ArrowUpRight size={14} />
          </Link>
        </aside>
      </div>
    </>
  );
}
