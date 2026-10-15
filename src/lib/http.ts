import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
  if (!origin || origin !== site) throw new HttpError(403, 'This request is not allowed.');
}
export async function readJson(request: Request, max = 131072): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Use a JSON request.');
  if (Number(request.headers.get('content-length')) > max)
    throw new HttpError(413, 'The request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, 'The request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
export function safeError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '23505')
    throw new HttpError(
      409,
      'That slug or unique value already exists. Only one resume can be published.',
    );
  if (error.code === '23503')
    throw new HttpError(409, 'This record is in use. Update its related content first.');
  throw new HttpError(400, 'The change could not be saved. Check your fields and permissions.');
}
