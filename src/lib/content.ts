import { z } from 'zod';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'date'
  | 'url'
  | 'email'
  | 'number'
  | 'checkbox'
  | 'list'
  | 'image'
  | 'pdf'
  | 'gallery'
  | 'category'
  | 'service-category'
  | 'price'
  | 'select';
export type Field = {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  max?: number;
  options?: string[];
  help?: string;
  default?: string | boolean | number;
};
const title: Field = { key: 'title', label: 'Title', required: true, max: 160 };
const description: Field = {
  key: 'description',
  label: 'Description',
  kind: 'textarea',
  max: 10000,
};
const publication: Field[] = [
  { key: 'sort_order', label: 'Display order', kind: 'number', default: 0 },
  {
    key: 'is_published',
    label: 'Published / visible to visitors',
    kind: 'checkbox',
    default: false,
  },
];
const start: Field = { key: 'start_date', label: 'Start date', kind: 'date' };
const end: Field = { key: 'end_date', label: 'End / graduation date', kind: 'date' };
export const entities = {
  projects: {
    label: 'Projects',
    singular: 'project',
    fields: [
      title,
      {
        key: 'slug',
        label: 'URL slug',
        required: true,
        max: 160,
        help: 'Lowercase words separated by hyphens.',
      },
      { key: 'short_description', label: 'Short description', kind: 'textarea', max: 400 },
      { ...description, max: 20000 },
      { key: 'problem', label: 'Problem statement', kind: 'textarea', max: 10000 },
      { key: 'solution', label: 'Solution', kind: 'textarea', max: 10000 },
      { key: 'role', label: 'Your responsibilities', kind: 'textarea', max: 5000 },
      { key: 'architecture', label: 'Architecture overview', kind: 'textarea', max: 10000 },
      { key: 'features', label: 'Features', kind: 'list' },
      { key: 'technologies', label: 'Technologies', kind: 'list' },
      { key: 'category', label: 'Category', required: true, max: 100, default: 'Other' },
      {
        key: 'status',
        label: 'Development status',
        kind: 'select',
        options: ['In progress', 'Completed', 'Maintained', 'Archived'],
        default: 'In progress',
      },
      start,
      { key: 'completion_date', label: 'Completion date', kind: 'date' },
      { key: 'thumbnail', label: 'Project thumbnail', kind: 'image' },
      {
        key: 'gallery',
        label: 'Screenshot gallery',
        kind: 'gallery',
        help: 'Upload screenshots, describe each image, and reorder with the arrow buttons.',
      },
      { key: 'github_url', label: 'Repository URL', kind: 'url' },
      { key: 'demo_url', label: 'Live demo URL', kind: 'url' },
      { key: 'documentation_url', label: 'Documentation URL', kind: 'url' },
      { key: 'is_featured', label: 'Featured on the homepage', kind: 'checkbox' },
      ...publication,
    ] as Field[],
  },
  skills: {
    label: 'Skills',
    singular: 'skill',
    fields: [
      { key: 'name', label: 'Skill name', required: true, max: 100 },
      { key: 'category_id', label: 'Category', kind: 'category', required: true },
      { key: 'icon', label: 'Text icon / abbreviation', max: 40 },
      { ...description, max: 1500 },
      ...publication,
    ] as Field[],
  },
  'skill-categories': {
    label: 'Skill categories',
    singular: 'category',
    fields: [
      { key: 'name', label: 'Category name', required: true, max: 100 },
      ...publication,
    ] as Field[],
  },
  experience: {
    label: 'Experience',
    singular: 'experience',
    fields: [
      title,
      { key: 'organization', label: 'Organization', required: true, max: 160 },
      { key: 'employment_type', label: 'Employment type' },
      { ...start, required: true },
      end,
      { key: 'is_current', label: 'Current position', kind: 'checkbox' },
      description,
      { key: 'responsibilities', label: 'Responsibilities', kind: 'list' },
      { key: 'technologies', label: 'Technologies', kind: 'list' },
      ...publication,
    ] as Field[],
  },
  education: {
    label: 'Education',
    singular: 'education',
    fields: [
      { key: 'institution', label: 'Institution', required: true, max: 160 },
      { ...title, label: 'Degree / program' },
      start,
      end,
      description,
      { key: 'achievements', label: 'Relevant achievements', kind: 'list' },
      ...publication,
    ] as Field[],
  },
  certificates: {
    label: 'Certificates',
    singular: 'certificate',
    fields: [
      title,
      { key: 'organization', label: 'Issuing organization', required: true, max: 160 },
      { key: 'issue_date', label: 'Issue date', kind: 'date' },
      { key: 'expiration_date', label: 'Expiration date', kind: 'date' },
      { key: 'credential_id', label: 'Credential ID' },
      { key: 'verification_url', label: 'Verification URL', kind: 'url' },
      { key: 'image', label: 'Certificate image', kind: 'image' },
      { key: 'file', label: 'Certificate PDF', kind: 'pdf' },
      description,
      ...publication,
    ] as Field[],
  },
  achievements: {
    label: 'Achievements',
    singular: 'achievement',
    fields: [
      title,
      { key: 'organization', label: 'Organization' },
      { key: 'category', label: 'Category' },
      { key: 'achieved_date', label: 'Date', kind: 'date' },
      description,
      { key: 'url', label: 'Related URL', kind: 'url' },
      ...publication,
    ] as Field[],
  },
  services: {
    label: 'Services',
    singular: 'service',
    fields: [
      title,
      { key: 'slug', label: 'Service slug', required: true, max: 200 },
      { key: 'category_id', label: 'Service category', kind: 'service-category' },
      { ...description, max: 5000 },
      { key: 'icon', label: 'Text icon / abbreviation' },
      {
        key: 'starting_price',
        label: 'Indicative starting price (PHP)',
        kind: 'price',
        help: 'Optional. This is not an automatic quotation or agreement.',
      },
      { key: 'is_featured', label: 'Featured service', kind: 'checkbox' },
      { key: 'is_archived', label: 'Archived (removed from new selections)', kind: 'checkbox' },
      ...publication,
    ] as Field[],
  },
  'service-categories': {
    label: 'Service categories',
    singular: 'service category',
    fields: [
      { key: 'name', label: 'Category name', required: true, max: 100 },
      { key: 'slug', label: 'Category slug', required: true, max: 160 },
      { ...description, max: 3000 },
      ...publication,
    ] as Field[],
  },
  'budget-ranges': {
    label: 'Inquiry budgets',
    singular: 'budget option',
    fields: [
      { key: 'label', label: 'Budget label', required: true, max: 100 },
      ...publication,
    ] as Field[],
  },
  'social-links': {
    label: 'Social links',
    singular: 'social link',
    fields: [
      { key: 'label', label: 'Platform / link label', required: true, max: 80 },
      { key: 'url', label: 'URL', kind: 'url', required: true },
      ...publication,
    ] as Field[],
  },
  resume: {
    label: 'Resume',
    singular: 'resume',
    fields: [
      title,
      { key: 'file', label: 'Resume PDF', kind: 'pdf', required: true },
      ...publication,
    ] as Field[],
  },
  settings: {
    label: 'Site settings',
    singular: 'settings',
    fields: [
      {
        key: 'site_title',
        label: 'Website title',
        required: true,
        max: 120,
        default: 'MaikuuuTech',
      },
      {
        key: 'developer_name',
        label: 'Display name',
        required: true,
        max: 100,
        default: 'MaikuuuTech',
      },
      {
        key: 'headline',
        label: 'Professional headline',
        max: 240,
        default: 'Full-Stack Developer | Mobile Application Developer | IoT Enthusiast',
      },
      { key: 'introduction', label: 'Short introduction', kind: 'textarea', max: 600 },
      { key: 'biography', label: 'Biography', kind: 'textarea', max: 12000 },
      { key: 'interests', label: 'Development interests', kind: 'textarea', max: 3000 },
      { key: 'career_goals', label: 'Career goals', kind: 'textarea', max: 3000 },
      { key: 'specializations', label: 'Specializations', kind: 'list' },
      { key: 'profile_image', label: 'Profile photograph', kind: 'image' },
      { key: 'contact_email', label: 'Public contact email', kind: 'email', max: 254 },
      { key: 'location', label: 'Location', max: 150 },
      { key: 'availability', label: 'Availability message', max: 120 },
      {
        key: 'seo_description',
        label: 'SEO description',
        kind: 'textarea',
        max: 320,
        default: 'The personal developer portfolio of MaikuuuTech.',
      },
      { key: 'og_image', label: 'Default sharing image', kind: 'image' },
      { key: 'footer_text', label: 'Footer text', max: 500 },
    ] as Field[],
  },
} as const;
export type Entity = keyof typeof entities;
export function isEntity(value: string): value is Entity {
  return Object.hasOwn(entities, value);
}
export const tableFor = (entity: Entity) =>
  ({
    experience: 'experiences',
    'skill-categories': 'skill_categories',
    'service-categories': 'service_categories',
    'budget-ranges': 'inquiry_budget_ranges',
    'social-links': 'social_links',
    resume: 'resumes',
    settings: 'site_settings',
  })[entity as string] || entity;

export const assetPath = z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/);
export const gallerySchema = z
  .array(
    z
      .object({
        path: assetPath,
        alt_text: z.string().trim().min(1).max(300),
        sort_order: z.number().int().min(0).max(10000),
      })
      .strict(),
  )
  .max(24);
function schemaFor(field: Field): z.ZodType {
  if (field.kind === 'checkbox') return z.boolean().default(false);
  if (field.kind === 'number') return z.number().int().min(-10000).max(10000).default(0);
  if (field.kind === 'gallery') return gallerySchema.default([]);
  if (field.kind === 'category') return z.uuid();
  if (field.kind === 'service-category')
    return z.union([z.uuid(), z.null(), z.literal('')]).transform((value) => value || null);
  if (field.kind === 'price')
    return z
      .union([z.number().finite().min(0).max(9999999999.99), z.null(), z.literal('')])
      .transform((value) => (value === '' ? null : value));
  if (field.kind === 'list') return z.array(z.string().trim().min(1).max(500)).max(60).default([]);
  if (field.kind === 'date')
    return field.required
      ? z.iso.date()
      : z.union([z.iso.date(), z.null(), z.literal('')]).transform((v) => v || null);
  if (field.kind === 'select') return z.enum(field.options as [string, ...string[]]);
  if (field.kind === 'image' || field.kind === 'pdf') {
    const file = assetPath.refine(
      (v) => (field.kind === 'pdf' ? v.endsWith('.pdf') : !v.endsWith('.pdf')),
      'Choose the correct file type.',
    );
    return field.required ? file : z.union([file, z.literal('')]);
  }
  let string = z
    .string()
    .trim()
    .max(field.max || 500);
  if (field.required) string = string.min(1, `${field.label} is required.`);
  if (field.key === 'slug')
    return string.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens.');
  if (field.kind === 'url') {
    const url = z
      .url()
      .max(2000)
      .refine((v) => v.startsWith('https://'), 'Use an HTTPS URL.');
    return field.required ? url : z.union([url, z.literal('')]);
  }
  if (field.kind === 'email') return z.union([z.email().max(254), z.literal('')]);
  return string;
}
export function entitySchema(entity: Entity) {
  return z
    .object(
      Object.fromEntries(entities[entity].fields.map((field) => [field.key, schemaFor(field)])),
    )
    .strict()
    .superRefine((data, ctx) => {
      for (const [a, b] of [
        ['start_date', 'end_date'],
        ['start_date', 'completion_date'],
        ['issue_date', 'expiration_date'],
      ]) {
        if (data[a] && data[b] && String(data[b]) < String(data[a]))
          ctx.addIssue({
            code: 'custom',
            path: [b],
            message: 'The end date must follow the start date.',
          });
      }
      if (data.is_current && data.end_date)
        ctx.addIssue({
          code: 'custom',
          path: ['end_date'],
          message: 'A current position cannot have an end date.',
        });
    });
}
export function defaultsFor(entity: Entity): Record<string, unknown> {
  return Object.fromEntries(
    entities[entity].fields.map((f) => [
      f.key,
      f.default ??
        (f.kind === 'checkbox'
          ? false
          : f.kind === 'number'
            ? 0
            : f.kind === 'gallery' || f.kind === 'list'
              ? []
              : ''),
    ]),
  );
}
export const contactSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    subject: z.string().trim().min(3).max(180),
    message: z.string().trim().min(10).max(5000),
    website: z.string().max(0).default(''),
    token: z.string().min(1).max(2048),
  })
  .strict();
export type Row = { id: string; created_at?: string; updated_at?: string; [key: string]: unknown };
export function str(row: Row | undefined, key: string): string {
  return typeof row?.[key] === 'string' ? (row[key] as string) : '';
}
export function strings(row: Row | undefined, key: string): string[] {
  return Array.isArray(row?.[key])
    ? (row[key] as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
}
export function mediaUrl(path: string) {
  return `/api/media/${path.split('/').map(encodeURIComponent).join('/')}`;
}
export const defaultSettings: Row = { id: '', ...defaultsFor('settings') };
