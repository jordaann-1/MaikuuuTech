import { ArrowUpRight, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { ContactExperience } from '@/components/contact-experience';
import { getSettings, published } from '@/lib/data';
import { str } from '@/lib/content';
import { pageMetadata } from '@/lib/metadata';
export const generateMetadata = () => pageMetadata('Contact', '/contact');
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [settings, socials, services, budgets, query] = await Promise.all([
    getSettings(),
    published('social_links'),
    published('services'),
    published('inquiry_budget_ranges'),
    searchParams,
  ]);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <div className="container page-content">
      <header className="page-heading">
        <div className="eyebrow">LET’S BUILD SOMETHING TOGETHER</div>
        <h1>
          Big ideas start
          <br />
          with a <span className="accent">conversation.</span>
        </h1>
        <p>
          Have a project in mind? Whether you need a website, application, database, or technical
          assistance, tell me what you’re looking for.
        </p>
      </header>
      <div className="contact-layout">
        <aside className="contact-aside">
          <span className="eyebrow">FROM IDEA TO POSSIBILITY</span>
          <h2>
            A little context.
            <br />A better beginning.
          </h2>
          <p className="muted">
            Share what you need, what matters, and where you’d like to go. We can work through the
            details together.
          </p>
          {str(settings, 'contact_email') && (
            <a className="contact-detail" href={'mailto:' + str(settings, 'contact_email')}>
              <Mail size={19} />
              <span>{str(settings, 'contact_email')}</span>
              <ArrowUpRight size={16} />
            </a>
          )}
          {str(settings, 'location') && (
            <p className="contact-detail">
              <MapPin size={19} />
              {str(settings, 'location')}
            </p>
          )}
          <div className="contact-socials">
            {socials.map((s) => (
              <a
                className="text-link"
                href={str(s, 'url')}
                key={s.id}
                target="_blank"
                rel="noopener noreferrer"
              >
                {str(s, 'label')}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
          <div className="contact-privacy">
            <ShieldCheck size={22} />
            <h3>Shared in confidence.</h3>
            <p>
              Your requirements and attachments are only available to the administrator for
              reviewing and responding to your request.
            </p>
          </div>
        </aside>
        <ContactExperience
          services={services}
          budgets={budgets}
          siteKey={siteKey?.startsWith('YOUR_') ? undefined : siteKey}
          selectedService={query.service}
        />
      </div>
    </div>
  );
}
