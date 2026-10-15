import { describe, expect, it } from 'vitest';
import { inquirySchema, inquiryPatchSchema, inquiryFiltersSchema } from '../src/lib/inquiries';
import { attachmentExtension, safeAttachmentName } from '../src/lib/inquiry-files';
import { defaultsFor, entitySchema } from '../src/lib/content';
const id = '11111111-1111-4111-8111-111111111111';
const valid = {
  submission_id: id,
  full_name: 'Test Visitor',
  email: 'visitor@example.com',
  preferred_contact_method: 'Email',
  service_id: id,
  project_title: 'Test requirements',
  project_description: 'A sufficiently detailed isolated test inquiry.',
  project_type: 'Personal',
  budget_range_id: id,
  urgency: 'Normal',
  privacy_consent: true,
};
describe('inquiry trust boundaries', () => {
  it('accepts minimal valid requests without inventing optional content', () => {
    const data = inquirySchema.parse(valid);
    expect(data.phone).toBe('');
    expect(data.preferred_deadline).toBe('');
  });
  it('rejects missing fields, invalid contact details, invalid service IDs and mass assignment', () => {
    for (const patch of [
      { full_name: 'x' },
      { email: 'invalid' },
      { service_id: 'missing' },
      { project_description: 'too short' },
      { budget_range_id: '' },
      { privacy_consent: false },
      { admin_notes: 'injected' },
      { status: 'Completed' },
      { website: 'bot' },
    ])
      expect(inquirySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it('supports PH and international numbers and requires the selected contact details', () => {
    for (const phone of ['+63 917 123 4567', '0917-123-4567', '+1 (415) 555-0100'])
      expect(
        inquirySchema.safeParse({ ...valid, phone, preferred_contact_method: 'Phone' }).success,
      ).toBe(true);
    for (const patch of [
      { phone: 'abcdef' },
      { preferred_contact_method: 'Phone' },
      { preferred_contact_method: 'Messenger' },
      { preferred_contact_method: 'Other', external_contact: 'a' },
    ])
      expect(inquirySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it('rejects impossible and past deadlines', () => {
    for (const date of ['2026-02-30', '2000-01-01', 'yesterday'])
      expect(inquirySchema.safeParse({ ...valid, preferred_deadline: date }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, preferred_deadline: '2099-12-01' }).success).toBe(
      true,
    );
  });
  it('keeps private updates bounded and separate from client urgency', () => {
    expect(
      inquiryPatchSchema.safeParse({
        status: 'In Progress',
        priority: 'High',
        admin_notes: 'Private notes',
      }).success,
    ).toBe(true);
    for (const data of [
      {},
      { urgency: 'Urgent' },
      { email: 'replace@example.com' },
      { priority: 'Flexible' },
      { admin_notes: 'x'.repeat(10001) },
    ])
      expect(inquiryPatchSchema.safeParse(data).success).toBe(false);
  });
  it('validates server filters including pagination and coherent dates', () => {
    expect(inquiryFiltersSchema.parse({ search: ' test ', page: '2' }).page).toBe(2);
    for (const data of [
      { page: -1 },
      { service: 'x' },
      { status: 'unknown' },
      { from: '2026-10-20', to: '2026-10-01' },
    ])
      expect(inquiryFiltersSchema.safeParse(data).success).toBe(false);
  });
  it('permits service category, activation, archive, pricing and ordering through the existing CMS', () => {
    const data = {
      ...defaultsFor('services'),
      title: 'Test service',
      slug: 'test-service',
      starting_price: 1500,
      category_id: id,
      is_published: true,
      is_archived: false,
      is_featured: true,
      sort_order: 3,
    };
    expect(entitySchema('services').safeParse(data).success).toBe(true);
    expect(entitySchema('services').safeParse({ ...data, starting_price: -1 }).success).toBe(false);
    expect(
      entitySchema('services').parse({ ...data, starting_price: '', category_id: '' }),
    ).toMatchObject({ starting_price: null, category_id: null });
  });
  it('checks content signatures, sizes, text encoding and unsafe document containers', () => {
    expect(attachmentExtension(new TextEncoder().encode('%PDF-1.7'), 'application/pdf')).toBe(
      'pdf',
    );
    expect(attachmentExtension(new TextEncoder().encode('Requirement notes'), 'text/plain')).toBe(
      'txt',
    );
    for (const [bytes, mime] of [
      [new Uint8Array(5242881), 'image/png'],
      [new Uint8Array([0xff, 0xff]), 'text/plain'],
      [new Uint8Array([0]), 'text/plain'],
      [new TextEncoder().encode('<svg/>'), 'image/png'],
      [
        new Uint8Array([80, 75, 3, 4]),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    ] as const)
      expect(attachmentExtension(bytes, mime)).toBeNull();
  });
  it('strips path, control, and extension manipulation from attachment names', () => {
    expect(safeAttachmentName('../../evil.exe', 'pdf')).toBe('evil.pdf');
    expect(safeAttachmentName('C:\\documents\\notes\u0000.pdf', 'pdf')).toBe('notes_.pdf');
    expect(safeAttachmentName('.'.repeat(100), 'txt')).toBe('attachment.txt');
  });
});
