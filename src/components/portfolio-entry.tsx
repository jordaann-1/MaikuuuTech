import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Award, FileText, Trophy, Code2 } from 'lucide-react';
import { mediaUrl, str, strings, type Row } from '@/lib/content';
function dateLabel(value: string) {
  if (!value) return '';
  const date = new Date(value + 'T00:00:00Z');
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
        date,
      );
}
export function PortfolioEntry({ row, section }: { row: Row; section: string }) {
  const timeline = section === 'experience' || section === 'education';
  return (
    <article className={'content-card entry-' + section}>
      {section === 'certificates' &&
        (str(row, 'image') ? (
          <a
            className="certificate-preview-link"
            href={mediaUrl(str(row, 'image'))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={'Preview ' + str(row, 'title')}
          >
            <img
              className="certificate-image"
              src={mediaUrl(str(row, 'image'))}
              width={700}
              height={500}
              alt={str(row, 'title') + ' certificate'}
              loading="lazy"
            />
          </a>
        ) : (
          <div className="certificate-fallback" aria-hidden="true">
            <Award size={48} strokeWidth={1} />
          </div>
        ))}
      {section === 'resume' && (
        <FileText className="entry-icon" size={28} strokeWidth={1.3} aria-hidden="true" />
      )}
      {section === 'achievements' && (
        <Trophy className="entry-icon" size={25} strokeWidth={1.3} aria-hidden="true" />
      )}
      {section === 'services' && (
        <Code2 className="entry-icon" size={25} strokeWidth={1.3} aria-hidden="true" />
      )}
      {section === 'services' && row.is_featured === true && (
        <span className="tag">Featured service</span>
      )}
      {timeline && str(row, 'start_date') && (
        <div className="timeline-dates">
          {dateLabel(str(row, 'start_date'))} —{' '}
          {row.is_current ? 'Present' : dateLabel(str(row, 'end_date')) || 'Ongoing'}
        </div>
      )}
      <div className="eyebrow">
        {str(row, 'category') ||
          str(row, 'employment_type') ||
          (!timeline ? str(row, 'organization') : '')}
      </div>
      <h2>{str(row, 'title')}</h2>
      {(str(row, 'organization') || str(row, 'institution')) && (
        <p className="organization">{str(row, 'organization') || str(row, 'institution')}</p>
      )}
      {!timeline && (str(row, 'issue_date') || str(row, 'achieved_date')) && (
        <p className="small muted">
          {dateLabel(str(row, 'issue_date') || str(row, 'achieved_date'))}
        </p>
      )}
      {str(row, 'description') && <p className="preserve-lines">{str(row, 'description')}</p>}
      {['responsibilities', 'achievements'].map(
        (key) =>
          strings(row, key).length > 0 && (
            <ul key={key}>
              {strings(row, key).map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ),
      )}
      {strings(row, 'technologies').length > 0 && (
        <div className="tag-list">
          {strings(row, 'technologies').map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
      {(str(row, 'credential_id') || str(row, 'expiration_date')) && (
        <div className="credential-info">
          {str(row, 'credential_id') && <span>Credential: {str(row, 'credential_id')}</span>}
          {str(row, 'expiration_date') && (
            <span>Expires {dateLabel(str(row, 'expiration_date'))}</span>
          )}
        </div>
      )}
      <div className="button-row">
        {section === 'services' && (
          <>
            <Link className="text-link" href={'/contact?service=' + row.id}>
              Discuss this service
              <ArrowUpRight size={15} />
            </Link>
            {typeof row.starting_price === 'number' && (
              <span className="field-help">
                From{' '}
                {new Intl.NumberFormat('en-PH', {
                  style: 'currency',
                  currency: 'PHP',
                  maximumFractionDigits: 0,
                }).format(row.starting_price)}{' '}
                · scope confirmed separately
              </span>
            )}
          </>
        )}
        {(str(row, 'verification_url') || str(row, 'url')) && (
          <a
            className="text-link"
            href={str(row, 'verification_url') || str(row, 'url')}
            target="_blank"
            rel="noopener noreferrer"
          >
            {section === 'certificates' ? 'Verify credential' : 'Learn more'}
            <ArrowUpRight size={15} />
          </a>
        )}
        {str(row, 'file') && (
          <>
            <a
              className="button secondary"
              href={mediaUrl(str(row, 'file'))}
              target="_blank"
              rel="noopener noreferrer"
            >
              View PDF
              <ArrowUpRight size={15} />
            </a>
            <a className="button primary" href={mediaUrl(str(row, 'file')) + '?download'}>
              Download
              <ArrowDown size={15} />
            </a>
          </>
        )}
      </div>
    </article>
  );
}
