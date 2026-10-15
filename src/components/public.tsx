import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Code2, Layers3, Plus } from 'lucide-react';
import { mediaUrl, str, type Row } from '@/lib/content';
export function SectionHeading({
  number,
  eyebrow,
  title,
  children,
}: {
  number?: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">
          {number && <span className="section-number">{number}</span>}
          {eyebrow}
        </div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function EmptyState({
  title = 'Something good is in the making.',
  description = 'New work will appear here when it’s ready to share.',
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={'empty-state ' + (compact ? 'compact' : '')}>
      <div className="empty-icon">
        <Layers3 size={24} strokeWidth={1.4} />
      </div>
      <div className="empty-copy">
        <span className="eyebrow">A LITTLE ROOM FOR WHAT’S NEXT</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Plus className="empty-detail" size={17} aria-hidden="true" />
    </div>
  );
}
export function ProjectCard({
  project,
  index = 0,
  featured = false,
}: {
  project: Row;
  index?: number;
  featured?: boolean;
}) {
  const technologies = (project.project_technologies as { name: string }[] | undefined) || [];
  return (
    <Link
      className={'project-card ' + (featured ? 'project-card-featured' : '')}
      href={'/projects/' + str(project, 'slug')}
    >
      <div className="project-art">
        {str(project, 'thumbnail') ? (
          <img
            src={mediaUrl(str(project, 'thumbnail'))}
            alt=""
            width={1000}
            height={650}
            loading="lazy"
          />
        ) : (
          <div className={'project-placeholder variant-' + (index % 3)}>
            <span className="placeholder-grid" />
            <Code2 size={72} strokeWidth={0.8} />
            <span>{str(project, 'category')}</span>
          </div>
        )}
        <span className="project-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="project-open">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="project-card-copy">
        <div className="project-meta">
          <span className="eyebrow">{str(project, 'category')}</span>
          {str(project, 'status') && (
            <span className="project-status">
              <span />
              {str(project, 'status')}
            </span>
          )}
        </div>
        <h3>{str(project, 'title')}</h3>
        <p>{str(project, 'short_description')}</p>
        {technologies.length > 0 && (
          <div className="tag-list">
            {technologies.slice(0, 5).map((t) => (
              <span className="tag" key={t.name}>
                {t.name}
              </span>
            ))}
          </div>
        )}
        <span className="project-action">
          View project <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}
export function ContactCTA() {
  return (
    <section className="contact-cta container">
      <div className="cta-grid" aria-hidden="true" />
      <div className="cta-copy">
        <span className="eyebrow">
          <span className="tiny-line" />
          THE NEXT GOOD IDEA STARTS HERE
        </span>
        <h2>
          Something in mind?
          <br />
          <span>Let’s make it happen.</span>
        </h2>
        <p>A project, an opportunity, or a simple hello.</p>
      </div>
      <Link href="/contact" className="button primary">
        Start a conversation
        <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}
export function HeroVisual({ profile, name }: { profile: string; name: string }) {
  return (
    <div className={'hero-visual ' + (profile ? 'has-profile' : '')}>
      {profile ? (
        <>
          <div className="profile-frame">
            <img
              className="profile-hero"
              src={mediaUrl(profile)}
              alt={name}
              width={600}
              height={680}
              fetchPriority="high"
            />
          </div>
          <span className="profile-caption">
            THE PERSON BEHIND THE CODE <ArrowUpRight size={14} />
          </span>
        </>
      ) : (
        <div className="engineering-visual" aria-hidden="true">
          <div className="visual-overline">
            <span>{name.toUpperCase()} / IN PERSPECTIVE</span>
            <Plus size={14} />
          </div>
          <svg viewBox="0 0 580 510" className="engineering-scene" fill="none">
            <defs>
              <linearGradient
                id="slab-top"
                x1="130"
                y1="140"
                x2="455"
                y2="340"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="var(--visual-top)" />
                <stop offset="1" stopColor="var(--visual-bottom)" />
              </linearGradient>
              <linearGradient
                id="slab-side"
                x1="120"
                y1="300"
                x2="465"
                y2="360"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#2864e8" />
                <stop offset="1" stopColor="#153c90" />
              </linearGradient>
            </defs>
            <g stroke="var(--visual-grid)" strokeWidth=".7">
              <path d="m-40 295 330-190 330 190M-40 345 290 155 620 345M-40 395 290 205 620 395M-40 445 290 255 620 445M-40 495 290 305 620 495" />
              <path d="m40 200 330 190M125 150l330 190M210 100l330 190M370 100 40 290M455 150 125 340M540 200 210 390" />
            </g>
            <g className="slab slab-bottom">
              <path
                d="m290 264 173 100-173 100-173-100 173-100Z"
                fill="var(--visual-base)"
                stroke="var(--visual-edge)"
              />
              <path
                d="m117 364 173 100v13L117 377v-13Zm173 100 173-100v13L290 477v-13Z"
                fill="var(--visual-side)"
                stroke="var(--visual-edge)"
              />
            </g>
            <g className="slab slab-middle">
              <path
                d="m290 191 173 100-173 100-173-100 173-100Z"
                fill="var(--visual-base)"
                stroke="var(--visual-edge)"
              />
              <path
                d="m117 291 173 100v13L117 304v-13Zm173 100 173-100v13L290 404v-13Z"
                fill="var(--visual-side)"
                stroke="var(--visual-edge)"
              />
              <path d="m153 292 137 79 137-79" stroke="#3b7cfa" strokeOpacity=".5" />
            </g>
            <g className="slab slab-top">
              <path
                d="m290 106 173 100-173 100-173-100 173-100Z"
                fill="url(#slab-top)"
                stroke="var(--visual-edge-bright)"
              />
              <path
                d="m117 206 173 100v16L117 222v-16Zm173 100 173-100v16L290 322v-16Z"
                fill="url(#slab-side)"
                stroke="#3b7cfa"
              />
              <path
                d="m238 203 28-16 29 29 49-8 28 16-78 16-29-29-27 16-24-14 24-10Z"
                fill="#e5eeff"
              />
              <path d="m290 128 135 78-135 78-135-78 135-78Z" stroke="#9dc5ff" strokeOpacity=".2" />
            </g>
            <g stroke="var(--visual-line)" strokeWidth="1">
              <path d="M131 190H58v-52M448 292h76v-39M287 467v25" />
              <circle cx="131" cy="190" r="3" fill="var(--accent)" />
              <circle cx="448" cy="292" r="3" fill="var(--accent)" />
            </g>
            <g
              fontFamily="var(--font-geist-mono),monospace"
              fontSize="10"
              letterSpacing="2"
              fill="var(--muted)"
            >
              <text x="37" y="125">
                WEB
              </text>
              <text x="480" y="240">
                MOBILE
              </text>
              <text x="278" y="507">
                IoT
              </text>
            </g>
          </svg>
          <div className="visual-caption">
            <span className="visual-caption-dot" /> DIFFERENT LAYERS. ONE PERSPECTIVE.<span>↗</span>
          </div>
        </div>
      )}
    </div>
  );
}
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
