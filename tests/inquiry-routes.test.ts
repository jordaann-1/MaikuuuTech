import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  lookup: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  bot: vi.fn(),
  deletion: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ adminSession: mocks.session }));
vi.mock('@/lib/inquiry-admin', () => ({
  inquiryId: (id: string) => id,
  privateHeaders: { 'Cache-Control': 'private, no-store' },
  inquiryDetail: vi.fn(),
}));
vi.mock('@/lib/inquiry-server', () => ({
  inquiryServiceClient: () => ({
    from: () => {
      const query = {
        error: null,
        select: () => query,
        eq: () => query,
        maybeSingle: mocks.lookup,
        delete: () => {
          mocks.deletion();
          return query;
        },
      };
      return query;
    },
    rpc: mocks.rpc,
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  }),
  readInquiryMultipart: (request: Request) => request.formData(),
  inquiryActor: async () => 'a'.repeat(64),
  hex: (buffer: ArrayBuffer) => Buffer.from(buffer).toString('hex'),
  verifyInquiryBot: mocks.bot,
  queryInquiries: vi.fn(),
}));
import { POST } from '../src/app/api/inquiries/route';
import { GET as list } from '../src/app/api/admin/inquiries/route';
import { GET as summary } from '../src/app/api/admin/inquiries/summary/route';
import { GET as detail, PATCH, DELETE } from '../src/app/api/admin/inquiries/[id]/route';
import { GET as download } from '../src/app/api/admin/inquiries/[id]/attachments/[attachmentId]/route';
const id = '11111111-1111-4111-8111-111111111111',
  reference = 'MKT-ABCDEF1234567890ABCDEF1234567890';
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
  token: 'fixture-token',
};
const context = { params: Promise.resolve({ id }) };
function request(data = valid, file?: File, origin = 'http://localhost:3000') {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (file) form.append('attachments', file);
  return POST(
    new Request('http://localhost:3000/api/inquiries', {
      method: 'POST',
      headers: { origin },
      body: form,
    }),
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.lookup.mockResolvedValue({ data: null, error: null });
  mocks.bot.mockResolvedValue(undefined);
  mocks.rpc.mockImplementation(async (name: string) =>
    name === 'reserve_inquiry'
      ? { data: { id, reference, state: 'uploading', existing: false }, error: null }
      : { data: null, error: null },
  );
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
describe('inquiry HTTP controllers with explicitly mocked external services', () => {
  it('denies anonymous list, summary, detail, mutation, deletion and attachment download', async () => {
    const req = new Request('http://localhost:3000/api/admin/inquiries', {
      headers: { origin: 'http://localhost:3000' },
    });
    for (const response of [
      await list(req),
      await summary(),
      await detail(req, context),
      await PATCH(req, context),
      await DELETE(req, context),
      await download(req, { params: Promise.resolve({ id, attachmentId: id }) }),
    ])
      expect(response.status).toBe(401);
  });
  it('rejects cross-site submission before bot or database operations', async () => {
    expect((await request(valid, undefined, 'https://attacker.example')).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects invalid input and forged file signatures before persistence', async () => {
    expect((await request({ ...valid, email: 'invalid' })).status).toBe(400);
    expect(
      (await request(valid, new File(['<script/>'], 'forged.png', { type: 'image/png' }))).status,
    ).toBe(400);
    expect(mocks.bot).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('returns a reference only after the completion transaction succeeds', async () => {
    const response = await request(
      valid,
      new File(['%PDF-1.7\nFixture'], 'requirements.pdf', { type: 'application/pdf' }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ reference });
    expect(mocks.rpc.mock.calls.map((call) => call[0])).toEqual([
      'reserve_inquiry',
      'complete_inquiry',
    ]);
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('returns the same confirmed reference on a complete matching retry before spending another CAPTCHA', async () => {
    mocks.lookup.mockResolvedValue({
      data: { public_reference: reference, submission_state: 'complete' },
    });
    const response = await request();
    expect(await response.json()).toEqual({ reference, duplicate: true });
    expect(mocks.bot).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('does not upload into a request already being processed', async () => {
    mocks.rpc.mockResolvedValue({ data: { id, reference, state: 'uploading', existing: true } });
    expect((await request()).status).toBe(409);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.deletion).not.toHaveBeenCalled();
  });
  it('maps inactive service and quota failures to safe client responses', async () => {
    for (const [code, status] of [
      ['22023', 400],
      ['P0001', 429],
      ['23505', 409],
    ]) {
      mocks.rpc.mockResolvedValue({ error: { code, message: 'Sensitive database detail' } });
      const response = await request();
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('Sensitive');
    }
  });
  it('compensates failed uploads and keeps cleanup references if storage deletion fails', async () => {
    mocks.lookup
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValue({ data: { submission_state: 'uploading' } });
    mocks.upload.mockResolvedValue({ error: { message: 'Sensitive upload error' } });
    const response = await request(
      valid,
      new File(['%PDF-1.7'], 'requirements.pdf', { type: 'application/pdf' }),
    );
    expect(response.status).toBe(503);
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.deletion).toHaveBeenCalledOnce();
    mocks.deletion.mockClear();
    mocks.lookup
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValue({ data: { submission_state: 'uploading' } });
    mocks.remove.mockResolvedValue({ error: { message: 'Unavailable' } });
    expect(
      (
        await request(
          valid,
          new File(['%PDF-1.7'], 'requirements.pdf', { type: 'application/pdf' }),
        )
      ).status,
    ).toBe(503);
    expect(mocks.deletion).not.toHaveBeenCalled();
  });
  it('preserves committed files if a completion response was lost', async () => {
    mocks.lookup
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValue({ data: { submission_state: 'complete' } });
    mocks.rpc.mockImplementation(async (name: string) =>
      name === 'reserve_inquiry'
        ? { data: { id, reference, state: 'uploading', existing: false } }
        : { error: { message: 'Connection lost after commit' } },
    );
    expect((await request()).status).toBe(200);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deletion).not.toHaveBeenCalled();
  });
});
