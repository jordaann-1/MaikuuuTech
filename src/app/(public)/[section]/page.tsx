import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { PortfolioEntry as ContentCard } from '@/components/portfolio-entry';
import { getSettings, published } from '@/lib/data';
import { mediaUrl, str, strings } from '@/lib/content';
import { ContactCTA, EmptyState } from '@/components/public';
import { pageMetadata } from '@/lib/metadata';
const sections: Record<
  string,
  { title: string; eyebrow: string; description: string; table?: string }
> = {
  about: {
    title: 'Behind the work.',
    eyebrow: 'A LITTLE MORE ABOUT ME',
    description: 'The person, the interests, and the direction behind the code.',
  },
  skills: {
    title: 'A considered toolkit.',
    eyebrow: 'SKILLS & TECHNOLOGIES',
    description: 'The languages, tools, and technologies I work with.',
    table: 'skills',
  },
  experience: {
    title: 'The journey so far.',
    eyebrow: 'PROFESSIONAL EXPERIENCE',
    description: 'Roles, responsibilities, and lessons along the way.',
    table: 'experiences',
  },
  education: {
    title: 'Always a student.',
    eyebrow: 'EDUCATION',
    description: 'The foundations of a continuing learning journey.',
    table: 'education',
  },
  certificates: {
    title: 'Learning, recognized.',
    eyebrow: 'CERTIFICATES',
    description: 'Verified learning and professional development.',
    table: 'certificates',
  },
  achievements: {
    title: 'Moments that matter.',
    eyebrow: 'ACHIEVEMENTS',
    description: 'Milestones, recognition, and memorable challenges.',
    table: 'achievements',
  },
  services: {
    title: 'Let’s make it happen.',
    eyebrow: 'SERVICES',
    description: 'Ways we can work together on your next idea.',
    table: 'services',
  },
  resume: {
    title: 'The bigger picture.',
    eyebrow: 'RESUME / CV',
    description: 'A closer look at my background, in one place.',
    table: 'resumes',
  },
};
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const key = (await params).section;
  return sections[key]
    ? pageMetadata(key.charAt(0).toUpperCase() + key.slice(1), `/${key}`)
    : { title: 'Not found' };
}
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = sections[section];
  if (!config) notFound();
  const [settings, rows, categories, highlights] = await Promise.all([
    getSettings(),
    config.table ? published(config.table) : Promise.resolve([]),
    section === 'skills' ? published('skill_categories') : Promise.resolve([]),
    section === 'about' ? published('achievements') : Promise.resolve([]),
  ]);
  return (
    <>
      <div className="container page-content">
        <header className="page-heading">
          <div className="eyebrow">{config.eyebrow}</div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </header>
        {section === 'about' ? (
          <div className="about-layout">
            <div className="about-portrait">
              {str(settings, 'profile_image') ? (
                <img
                  src={mediaUrl(str(settings, 'profile_image'))}
                  alt={str(settings, 'developer_name')}
                  width={600}
                  height={700}
                />
              ) : (
                <div
                  className="portrait-monogram"
                  role="img"
                  aria-label="Profile photograph not yet added"
                >
                  m<span>.</span>
                </div>
              )}
            </div>
            <div className="prose">
              <h2>{str(settings, 'developer_name')}</h2>
              <p className="lead">{str(settings, 'headline')}</p>
              {str(settings, 'location') && (
                <p className="location">
                  <MapPin size={16} />
                  {str(settings, 'location')}
                </p>
              )}
              {str(settings, 'biography') ? (
                <p>{str(settings, 'biography')}</p>
              ) : (
                <p className="muted">A personal introduction is on its way.</p>
              )}
              {[
                ['interests', 'What I’m exploring'],
                ['career_goals', 'Where I’m headed'],
              ].map(
                ([key, label]) =>
                  str(settings, key) && (
                    <section key={key}>
                      <h3>{label}</h3>
                      <p>{str(settings, key)}</p>
                    </section>
                  ),
              )}
              {strings(settings, 'specializations').length > 0 && (
                <div className="tag-list">
                  {strings(settings, 'specializations').map((s) => (
                    <span className="tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : section === 'skills' && rows.length ? (
          <div className="skill-groups">
            {categories
              .filter((c) => rows.some((s) => s.category_id === c.id))
              .map((c) => (
                <section className="skill-group" key={c.id}>
                  <h2>{str(c, 'name')}</h2>
                  <div className="skill-list">
                    {rows
                      .filter((s) => s.category_id === c.id)
                      .map((s) => (
                        <article key={s.id}>
                          <span className="skill-abbreviation">
                            {str(s, 'icon') || str(s, 'name').slice(0, 2)}
                          </span>
                          <div>
                            <h3>{str(s, 'name')}</h3>
                            {str(s, 'description') && <p>{str(s, 'description')}</p>}
                          </div>
                        </article>
                      ))}
                  </div>
                </section>
              ))}
          </div>
        ) : rows.length ? (
          <div
            className={
              ['experience', 'education', 'resume'].includes(section)
                ? 'timeline-list'
                : 'content-grid'
            }
          >
            {rows.map((row) => (
              <ContentCard key={row.id} row={row} section={section} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={section === 'resume' ? 'Resume coming soon.' : 'A story still unfolding.'}
            description={
              section === 'resume'
                ? 'My resume will be available to view and download here once it is published.'
                : `Published ${section} will appear here. Check back soon.`
            }
          />
        )}
        {section === 'about' && highlights.length > 0 && (
          <section className="section">
            <h2>Selected milestones</h2>
            <div className="content-grid">
              {highlights.slice(0, 4).map((row) => (
                <ContentCard row={row} section="achievements" key={row.id} />
              ))}
            </div>
          </section>
        )}
      </div>
      {section !== 'resume' && <ContactCTA />}
    </>
  );
}
