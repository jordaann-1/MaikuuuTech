import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpen, Github, Layers3 } from 'lucide-react';
import { mediaUrl, str, strings, type Row } from '@/lib/content';
export function ProjectCaseStudy({ project }: { project: Row }) {
  const gallery = [...((project.project_images as Row[]) || [])].sort(
    (a, b) => Number(a.sort_order) - Number(b.sort_order),
  );
  const technologies = (project.project_technologies as { name: string }[]) || [];
  const sections = [
    ['description', 'Project overview'],
    ['problem', 'The problem'],
    ['solution', 'The solution'],
    ['architecture', 'Architecture & approach'],
    ['role', 'My contribution'],
  ].filter(([key]) => str(project, key));
  return (
    <article className="container page-content project-detail">
      <Link href="/projects" className="text-link">
        <ArrowLeft size={15} />
        Back to projects
      </Link>
      <header className="page-heading">
        <div className="eyebrow">
          <span className="section-number">
            <Layers3 size={12} />
          </span>
          ENGINEERING CASE STUDY{str(project, 'category') && <> / {str(project, 'category')}</>}
        </div>
        <h1>{str(project, 'title')}</h1>
        <p>{str(project, 'short_description')}</p>
        {technologies.length > 0 && (
          <div className="tag-list">
            {technologies.map((t) => (
              <span className="tag" key={t.name}>
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div className="button-row">
          {[
            ['demo_url', 'Live demo', ArrowUpRight],
            ['github_url', 'Source code', Github],
            ['documentation_url', 'Documentation', BookOpen],
          ].map(
            ([key, label, Icon]) =>
              str(project, key as string) && (
                <a
                  key={key as string}
                  className={'button ' + (key === 'demo_url' ? 'primary' : 'secondary')}
                  href={str(project, key as string)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label as string}
                  <Icon size={16} />
                </a>
              ),
          )}
        </div>
      </header>
      {str(project, 'thumbnail') && (
        <img
          className="detail-cover"
          src={mediaUrl(str(project, 'thumbnail'))}
          alt={str(project, 'title') + ' preview'}
          width={1200}
          height={750}
          fetchPriority="high"
        />
      )}
      <div className="detail-layout">
        <div className="prose">
          {sections.map(([key, label], index) => (
            <section className="case-study-section" key={key} id={key}>
              <span className="case-study-number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{label}</h2>
                <p>{str(project, key)}</p>
              </div>
            </section>
          ))}
          {strings(project, 'features').length > 0 && (
            <section className="case-study-section">
              <span className="case-study-number">
                {String(sections.length + 1).padStart(2, '0')}
              </span>
              <div>
                <h2>Key features</h2>
                <ul>
                  {strings(project, 'features').map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
        <aside className="project-facts">
          <h3>At a glance</h3>
          <dl>
            <dt>Status</dt>
            <dd>
              <span className="project-status">
                <span />
                {str(project, 'status')}
              </span>
            </dd>
            {str(project, 'category') && (
              <>
                <dt>Category</dt>
                <dd>{str(project, 'category')}</dd>
              </>
            )}
            {str(project, 'start_date') && (
              <>
                <dt>Started</dt>
                <dd>{str(project, 'start_date')}</dd>
              </>
            )}
            {str(project, 'completion_date') && (
              <>
                <dt>Completed</dt>
                <dd>{str(project, 'completion_date')}</dd>
              </>
            )}
          </dl>
        </aside>
      </div>
      {gallery.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">A CLOSER LOOK</div>
              <h2>Inside the experience.</h2>
            </div>
            <span className="eyebrow">
              {gallery.length} {gallery.length === 1 ? 'IMAGE' : 'IMAGES'}
            </span>
          </div>
          <div className="gallery-grid">
            {gallery.map((g) => (
              <figure key={g.id || str(g, 'path')}>
                <a
                  href={mediaUrl(str(g, 'path'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={'Open screenshot: ' + str(g, 'alt_text')}
                >
                  <img
                    src={mediaUrl(str(g, 'path'))}
                    alt={str(g, 'alt_text')}
                    width={1000}
                    height={650}
                    loading="lazy"
                  />
                </a>
                <figcaption>{str(g, 'alt_text')}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
