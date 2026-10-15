import { createRoot } from 'react-dom/client';
import { AdminShell } from '../../src/components/admin-shell';
import { InquiryProvider } from '../../src/components/inquiry-polling';
import { InquiryList } from '../../src/components/inquiry-list';
import { InquiryDetail } from '../../src/components/inquiry-detail';
import { InquiryForm } from '../../src/components/inquiry-form';
import { ContentEditor } from '../../src/components/content-editor';
import { ContentManager } from '../../src/components/content-manager';
import { DashboardOverview } from '../../src/components/dashboard-overview';
import { ProjectCard, SectionHeading } from '../../src/components/public';
import { ProjectCaseStudy } from '../../src/components/project-case-study';
import { PortfolioEntry } from '../../src/components/portfolio-entry';
import { inquiryFiltersSchema } from '../../src/lib/inquiries';
import { defaultsFor, type Row } from '../../src/lib/content';
export const serviceId = '33333333-3333-4333-8333-333333333333',
  budgetId = '44444444-4444-4444-8444-444444444444',
  id = '55555555-5555-4555-8555-555555555555';
const services = [
  {
    id: serviceId,
    title: 'Fixture website development',
    slug: 'fixture-website',
    description: 'An isolated service for local component testing.',
    is_published: true,
  },
];
const budgets = [{ id: budgetId, label: 'Fixture budget · Prefer to discuss' }];
const inquiry: Row = {
  id,
  public_reference: 'MKT-ABCDEF1234567890ABCDEF1234567890',
  full_name: 'Fixture Client',
  email: 'fixture@example.com',
  phone: '+63 917 000 0000',
  preferred_contact_method: 'Email',
  external_contact: 'https://example.com/fixture',
  service_id: serviceId,
  service_name_snapshot: services[0].title,
  project_title: 'Fixture inventory application',
  project_description:
    'This is an isolated local test inquiry. It is not a real client request. The application needs a responsive inventory workflow with reporting and access controls.',
  required_features: 'Inventory search\nRole management\nMonthly reporting',
  project_type: 'Business',
  budget_range: budgets[0].label,
  preferred_deadline: '2099-12-01',
  urgency: 'Urgent',
  additional_notes: 'Local fixture only.',
  status: 'New',
  priority: 'Normal',
  admin_notes: 'Private fixture notes',
  is_read: false,
  is_archived: false,
  privacy_consent_at: '2026-10-15T10:30:00Z',
  privacy_notice_version: '2026-10-15',
  created_at: '2026-10-15T10:30:00Z',
  updated_at: '2026-10-15T10:30:00Z',
  inquiry_attachments: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      original_filename: 'fixture-requirements.pdf',
      file_size: 1234,
      mime_type: 'application/pdf',
    },
  ],
  inquiry_activity: [
    {
      id: 'activity',
      action: 'Inquiry created',
      new_status: 'New',
      created_at: '2026-10-15T10:30:00Z',
    },
  ],
};
const project: Row = {
  ...defaultsFor('projects'),
  id,
  title: 'Fixture connected workspace',
  slug: 'fixture-connected-workspace',
  category: 'Web application',
  status: 'Completed',
  short_description:
    'An isolated example for testing project layouts. This is not portfolio content.',
  description:
    'A local fixture demonstrating a structured case study and responsive project layout.',
  problem: 'A fictional workflow for component testing.',
  solution: 'A responsive interface, accessible controls, and a clear hierarchy.',
  architecture: 'Next.js, TypeScript, PostgreSQL, and private file storage.',
  role: 'Local test fixture only.',
  features: ['Accessible search', 'Private documents', 'Responsive dashboard'],
  is_published: true,
  is_featured: true,
  project_technologies: [{ name: 'TypeScript' }, { name: 'Next.js' }, { name: 'PostgreSQL' }],
  project_images: [],
  updated_at: '2026-10-15T10:30:00Z',
};
const params = new URLSearchParams(location.search),
  mode = params.get('mode') || 'list';
const content =
  mode === 'detail' ? (
    <InquiryDetail initial={inquiry} />
  ) : mode === 'editor' ? (
    <ContentEditor
      entity={params.get('entity') === 'services' ? 'services' : 'projects'}
      row={params.get('entity') === 'services' ? undefined : project}
    />
  ) : mode === 'manager' ? (
    <ContentManager entity="projects" initialRows={[project]} initialCount={1} />
  ) : mode === 'overview' ? (
    <DashboardOverview
      name="Fixture administrator"
      counts={[1, 0, 4, 1, 2, 1]}
      recent={[{ ...project, entity: 'projects' }]}
    />
  ) : (
    <InquiryList
      initial={{ rows: [inquiry], count: 1 }}
      initialFilters={inquiryFiltersSchema.parse({})}
      services={services}
    />
  );
createRoot(document.getElementById('root')!).render(
  mode === 'form' ? (
    <main className="container page-content" style={{ maxWidth: 820 }}>
      <h1>Isolated inquiry form</h1>
      <InquiryForm services={services} budgets={budgets} siteKey="fixture-only" />
    </main>
  ) : mode === 'case' ? (
    <main>
      <ProjectCaseStudy project={project} />
    </main>
  ) : mode === 'cards' ? (
    <main className="container page-content">
      <h1>Isolated content fixtures</h1>
      <SectionHeading eyebrow="LOCAL TEST FIXTURES" title="Project presentation" />
      <div className="project-grid">
        {[0, 1, 2, 3].map((index) => (
          <ProjectCard
            key={index}
            project={{ ...project, id: String(index), title: project.title + ' ' + index }}
            index={index}
            featured={index === 0 || index === 3}
          />
        ))}
      </div>
      <section className="section">
        <h2>Certificate presentation</h2>
        <div className="content-grid">
          <PortfolioEntry
            section="certificates"
            row={{
              id: 'certificate',
              title: 'Fixture certificate',
              organization: 'Fixture issuer',
              description: 'Local layout test only.',
              issue_date: '2026-01-01',
              verification_url: 'https://example.com',
            }}
          />
          <PortfolioEntry section="services" row={services[0]} />
        </div>
      </section>
    </main>
  ) : (
    <InquiryProvider>
      <AdminShell name="Fixture administrator">{content}</AdminShell>
    </InquiryProvider>
  ),
);
