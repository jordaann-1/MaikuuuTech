import { afterEach, describe, expect, it } from 'vitest';
import { sameOrigin, readJson, safeError } from '../src/lib/http';
describe('request protection', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  });
  it('rejects cross-origin and missing-origin mutations', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://portfolio.example';
    expect(() =>
      sameOrigin(
        new Request('https://portfolio.example/api', {
          headers: { origin: 'https://attacker.example' },
        }),
      ),
    ).toThrow();
    expect(() => sameOrigin(new Request('https://portfolio.example/api'))).toThrow();
    expect(() =>
      sameOrigin(
        new Request('https://portfolio.example/api', {
          headers: { origin: 'https://portfolio.example' },
        }),
      ),
    ).not.toThrow();
  });
  it('limits streamed bodies, even without content-length', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(1000) }),
    });
    await expect(readJson(request, 100)).rejects.toMatchObject({ status: 413 });
  });
  it('rejects malformed JSON and non-JSON content', async () => {
    await expect(
      readJson(
        new Request('http://localhost/api', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{invalid',
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      readJson(new Request('http://localhost/api', { method: 'POST', body: 'plain' })),
    ).rejects.toMatchObject({ status: 415 });
  });
  it('never exposes internal errors', async () => {
    const response = safeError(new Error('postgres://private-password'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private-password');
  });
});
