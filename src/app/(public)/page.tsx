import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Download, Sparkles } from 'lucide-react';
import { getSettings, homeProjects, published, siteUrl } from '@/lib/data';
import { str } from '@/lib/content';
import {
  ContactCTA,
  EmptyState,
  HeroVisual,
  ProjectCard,
  SectionHeading,
  TextLink,
} from '@/components/public';
import { pageMetadata } from '@/lib/metadata';
export const generateMetadata = () => pageMetadata('Home', '/');
export default async function Home() {
  const [settings, projects, skills, categories, resumes, socials] = await Promise.all([
    getSettings(),
    homeProjects(),
    published('skills'),
    published('skill_categories'),
    published('resumes'),
    published('social_links'),
  ]);
  const headline = str(settings, 'headline')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  const words = (headline[0] || 'Developer').split(' ');
  const lastWord = words.pop();
  const featured = projects.filter((p) => p.is_featured).slice(0, 4);
  const shown = featured.length ? featured : projects.slice(0, 4);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: str(settings, 'developer_name'),
    url: siteUrl(),
    ...(str(settings, 'biography') ? { description: str(settings, 'biography') } : {}),
    sameAs: socials.map((s) => str(s, 'url')),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" />
            <span>{str(settings, 'availability') || 'PERSONAL DEVELOPER PORTFOLIO'}</span>
          </div>
          <p className="hero-intro">
            Hello, I’m <span>{str(settings, 'developer_name')}.</span>
          </p>
          <h1>
            {words.length > 0 && <span>{words.join(' ')} </span>}
            <span className="hero-title-accent">
              {lastWord}
              <span className="hero-period">.</span>
            </span>
          </h1>
          <p className="hero-description">
            {str(settings, 'introduction') ||
              'Selected work, ideas in progress, and the thinking behind the build.'}
          </p>
          <div className="button-row">
            <Link href="/projects" className="button primary">
              View projects
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/contact" className="button secondary">
              Get in touch
              <ArrowUpRight size={17} />
            </Link>
          </div>
          {(socials.length > 0 || resumes.length > 0) && (
            <div className="hero-links">
              {socials.map((s) => (
                <a href={str(s, 'url')} key={s.id} target="_blank" rel="noopener noreferrer">
                  {str(s, 'label')}
                  <ArrowUpRight size={13} />
                </a>
              ))}
              {resumes.length > 0 && (
                <Link href="/resume">
                  <Download size={13} />
                  Resume
                </Link>
              )}
            </div>
          )}
        </div>
        <HeroVisual
          profile={str(settings, 'profile_image')}
          name={str(settings, 'developer_name')}
        />
        <div className="hero-bottom">
          <div className="hero-disciplines">
            {headline.slice(1).map((item, index) => (
              <span key={item}>
                <span className="discipline-index">{String(index + 1).padStart(2, '0')}</span>
                {item}
              </span>
            ))}
          </div>
          <a href="#selected-work" className="scroll-link">
            EXPLORE THE PORTFOLIO
            <ArrowDown size={14} />
          </a>
        </div>
      </section>
      <section id="selected-work" className="section container work-section">
        <SectionHeading number="01" eyebrow="SELECTED WORK" title="Ideas, engineered into reality.">
          <TextLink href="/projects">All projects</TextLink>
        </SectionHeading>
        {shown.length ? (
          <div className="project-grid">
            {shown.map((p, i) => (
              <ProjectCard
                project={p}
                index={i}
                featured={shown.length >= 3 && (i === 0 || (shown.length === 4 && i === 3))}
                key={p.id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="The next chapter is building."
            description="Selected projects and the thinking behind them will live here. Stay curious."
          />
        )}
      </section>
      <section className="about-preview section container">
        <div className="about-preview-title">
          <div className="eyebrow">
            <span className="section-number">02</span>THE PERSON BEHIND THE WORK
          </div>
          <h2>
            Curiosity is
            <br />
            the starting point<span className="accent">.</span>
          </h2>
          <TextLink href="/about">More about me</TextLink>
        </div>
        <div className="about-preview-copy">
          <Sparkles size={25} strokeWidth={1.3} className="about-spark" aria-hidden="true" />
          <p className="lead">
            {str(settings, 'biography')
              ? str(settings, 'biography').slice(0, 480)
              : 'Every project has a story. This is where I’ll share mine.'}
          </p>
          {str(settings, 'interests') && (
            <p className="muted preserve-lines">{str(settings, 'interests')}</p>
          )}
          {str(settings, 'location') && (
            <span className="about-location">{str(settings, 'location')}</span>
          )}
        </div>
      </section>
      <section className="section skills-preview container">
        <SectionHeading
          number="03"
          eyebrow="SKILLS & TECHNOLOGIES"
          title="A toolkit with intention."
        >
          <TextLink href="/skills">Explore my skills</TextLink>
        </SectionHeading>
        {skills.length ? (
          <div className="skill-groups">
            {categories
              .filter((c) => skills.some((s) => s.category_id === c.id))
              .slice(0, 4)
              .map((c, index) => (
                <div className="skill-group" key={c.id}>
                  <div className="skill-group-heading">
                    <span className="eyebrow">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{str(c, 'name')}</h3>
                  </div>
                  <div className="tag-list">
                    {skills
                      .filter((s) => s.category_id === c.id)
                      .map((s) => (
                        <span className="tag" key={s.id}>
                          {str(s, 'name')}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="quiet-empty">
            <span className="quiet-empty-symbol" aria-hidden="true">
              ↳
            </span>
            <p>My toolkit will take shape here as skills are added.</p>
            <span className="eyebrow">ALWAYS A WORK IN PROGRESS</span>
          </div>
        )}
      </section>
      <ContactCTA />
    </>
  );
}
