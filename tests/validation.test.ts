import { describe, expect, it } from 'vitest';
import { contactSchema, defaultsFor, entitySchema, assetPath } from '../src/lib/content';
import { detectFile } from '../src/lib/uploads';
import { formValues } from '../src/lib/admin-data';
describe('input trust boundaries', () => {
  const project = {
    ...defaultsFor('projects'),
    title: 'Validation fixture',
    slug: 'validation-fixture',
  };
  it('accepts complete drafts and rejects mass assignment', () => {
    expect(entitySchema('projects').safeParse(project).success).toBe(true);
    expect(
      entitySchema('projects').safeParse({ ...project, id: 'injected', created_at: 'injected' })
        .success,
    ).toBe(false);
  });
  it('rejects script links, unsafe slugs, invalid dates, and negative galleries', () => {
    for (const extra of [
      { demo_url: 'javascript:alert(1)' },
      { slug: '../admin' },
      { start_date: '2026-02-30' },
      { start_date: '2026-10-15', completion_date: '2026-01-01' },
      { gallery: [{ path: 'arbitrary.svg', alt_text: '', sort_order: -1 }] },
    ])
      expect(entitySchema('projects').safeParse({ ...project, ...extra }).success).toBe(false);
  });
  it('requires image descriptions and restricted media paths', () => {
    expect(assetPath.safeParse('../../secret.pdf').success).toBe(false);
    expect(
      entitySchema('projects').safeParse({
        ...project,
        gallery: [
          {
            path: '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png',
            alt_text: '',
            sort_order: 0,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('requires coherent current positions', () => {
    expect(
      entitySchema('experience').safeParse({
        ...defaultsFor('experience'),
        title: 'Test role',
        organization: 'Test organization',
        start_date: '2026-01-01',
        end_date: '2026-10-01',
        is_current: true,
      }).success,
    ).toBe(false);
  });
  it('validates messages and the honeypot', () => {
    const message = {
      full_name: 'Test Visitor',
      email: 'visitor@example.com',
      subject: 'Test subject',
      message: 'A valid test message.',
      website: '',
      token: 'verification-token',
    };
    expect(contactSchema.safeParse(message).success).toBe(true);
    for (const extra of [
      { email: 'bad' },
      { message: 'short' },
      { website: 'spam' },
      { token: '' },
      { message: 'x'.repeat(5001) },
    ])
      expect(contactSchema.safeParse({ ...message, ...extra }).success).toBe(false);
  });
  it('rejects forged MIME types and executable assets', () => {
    expect(
      detectFile(new TextEncoder().encode('<script>alert(1)</script>'), 'image/png'),
    ).toBeNull();
    expect(detectFile(new Uint8Array([255, 216, 255]), 'image/jpeg')).toBe('jpg');
    expect(detectFile(new TextEncoder().encode('%PDF-1.7'), 'application/pdf')).toBe('pdf');
    expect(detectFile(new TextEncoder().encode('<svg/>'), 'image/svg+xml')).toBeNull();
  });
  it('only sends editable columns and normalizes project children', () => {
    const form = formValues('projects', {
      id: 'id',
      title: 'Project',
      admin: true,
      project_technologies: [{ name: 'TypeScript' }],
      project_images: [{ id: 'image', path: 'path', alt_text: 'Preview', sort_order: 0 }],
    });
    expect(form).not.toHaveProperty('admin');
    expect(form).not.toHaveProperty('id');
    expect(form.technologies).toEqual(['TypeScript']);
    expect(form.gallery).toEqual([{ path: 'path', alt_text: 'Preview', sort_order: 0 }]);
  });
});
