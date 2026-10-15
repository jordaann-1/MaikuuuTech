import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  session: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  recover: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  isConfigured: mocks.configured,
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signIn,
      signOut: mocks.signOut,
      resetPasswordForEmail: mocks.recover,
      updateUser: mocks.update,
    },
  }),
}));
vi.mock('@/lib/auth', () => ({ adminSession: mocks.session }));
import { POST } from '../src/app/api/auth/[action]/route';
function request(action: string, data: Record<string, unknown> = {}) {
  return POST(
    new Request(`http://localhost:3000/api/auth/${action}`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify(data),
    }),
    { params: Promise.resolve({ action }) },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.recover.mockResolvedValue({ error: null });
  mocks.update.mockResolvedValue({ error: null });
});
describe('authentication controller (Supabase service mocked)', () => {
  it('accepts valid credentials only with trusted membership', async () => {
    mocks.session.mockResolvedValue({ profile: { id: 'admin' } });
    expect(
      (await request('login', { email: 'test@example.com', password: 'long-test-password' }))
        .status,
    ).toBe(200);
    expect(mocks.signIn).toHaveBeenCalledOnce();
  });
  it('rejects invalid credentials without exposing upstream details', async () => {
    mocks.signIn.mockResolvedValue({ error: { message: 'sensitive auth detail' } });
    const response = await request('login', { email: 'test@example.com', password: 'bad' });
    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
  it('logs out authenticated nonadmins', async () => {
    mocks.session.mockResolvedValue(null);
    expect(
      (await request('login', { email: 'test@example.com', password: 'long-test-password' }))
        .status,
    ).toBe(403);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it('ends the session on logout', async () => {
    expect((await request('logout')).status).toBe(200);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it('rejects password changes without an authorized session', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await request('password', { password: 'a-new-long-password' })).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('keeps password recovery responses account-neutral', async () => {
    mocks.recover.mockResolvedValue({ error: { message: 'Account absent' } });
    const response = await request('recover', { email: 'unknown@example.com' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
  it('reports unavailable infrastructure accurately', async () => {
    mocks.configured.mockReturnValue(false);
    expect(
      (await request('login', { email: 'test@example.com', password: 'long-test-password' }))
        .status,
    ).toBe(503);
  });
});
