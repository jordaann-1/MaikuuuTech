import { z } from 'zod';
export const inquiryStatuses = [
  'New',
  'Under Review',
  'Contacted',
  'Awaiting Client',
  'Accepted',
  'In Progress',
  'Completed',
  'Declined',
  'Cancelled',
] as const;
export const inquiryPriorities = ['Low', 'Normal', 'High', 'Urgent'] as const;
export const projectTypes = ['Personal', 'Academic', 'Business', 'Organization', 'Other'] as const;
export const contactMethods = ['Email', 'Phone', 'Messenger', 'Other'] as const;
export const urgencyOptions = ['Flexible', 'Normal', 'Urgent'] as const;
export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const MAX_INQUIRY_BODY = MAX_ATTACHMENTS * MAX_ATTACHMENT_SIZE + 131072;
export const attachmentAccept = '.pdf,.jpg,.jpeg,.png,.webp,.txt,.docx';
export function inquiryToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const inquirySchema = z
  .object({
    submission_id: z.uuid(),
    full_name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    phone: optionalText(32).refine(
      (value) =>
        !value ||
        (/^[+()\d\s.-]+$/.test(value) &&
          value.replace(/\D/g, '').length >= 7 &&
          value.replace(/\D/g, '').length <= 15),
      'Enter a valid Philippine or international phone number.',
    ),
    preferred_contact_method: z.enum(contactMethods),
    external_contact: optionalText(500),
    service_id: z.uuid(),
    project_title: z.string().trim().min(3).max(180),
    project_description: z.string().trim().min(20).max(10000),
    required_features: optionalText(5000),
    project_type: z.enum(projectTypes),
    budget_range_id: z.uuid(),
    preferred_deadline: z
      .union([z.iso.date(), z.literal('')])
      .default('')
      .refine((date) => !date || date >= inquiryToday(), 'Choose today or a future date.'),
    urgency: z.enum(urgencyOptions),
    additional_notes: optionalText(3000),
    privacy_consent: z.literal(true, { error: 'Please acknowledge the privacy notice.' }),
    website: z.string().max(0).default(''),
    token: z.string().max(2048).default(''),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.preferred_contact_method === 'Phone' && !data.phone)
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Enter a phone number for phone contact.',
      });
    if (
      ['Messenger', 'Other'].includes(data.preferred_contact_method) &&
      data.external_contact.length < 3
    )
      ctx.addIssue({
        code: 'custom',
        path: ['external_contact'],
        message: 'Provide your preferred contact details.',
      });
  });
export type InquiryInput = z.infer<typeof inquirySchema>;
export const inquiryPatchSchema = z
  .object({
    status: z.enum(inquiryStatuses).optional(),
    priority: z.enum(inquiryPriorities).optional(),
    admin_notes: z.string().max(10000).optional(),
    is_read: z.boolean().optional(),
    is_archived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'No changes provided.');
export const inquiryFiltersSchema = z
  .object({
    search: z.string().trim().max(100).default(''),
    status: z.union([z.enum(inquiryStatuses), z.literal('')]).default(''),
    priority: z.union([z.enum(inquiryPriorities), z.literal('')]).default(''),
    service: z.union([z.uuid(), z.literal('')]).default(''),
    from: z.union([z.iso.date(), z.literal('')]).default(''),
    to: z.union([z.iso.date(), z.literal('')]).default(''),
    sort: z.enum(['newest', 'oldest']).default('newest'),
    archive: z.enum(['active', 'archived', 'all']).default('active'),
    page: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict()
  .refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    'Start date must precede end date.',
  );
export type InquiryFilters = z.infer<typeof inquiryFiltersSchema>;
