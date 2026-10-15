export const MAX_UPLOAD = 10 * 1024 * 1024;
export function detectFile(bytes: Uint8Array, mime: string): string | null {
  const signature = (data: number[]) => data.every((v, i) => bytes[i] === v);
  if (mime === 'image/jpeg' && signature([255, 216, 255])) return 'jpg';
  if (mime === 'image/png' && signature([137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
  if (
    mime === 'image/webp' &&
    signature([82, 73, 70, 70]) &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  )
    return 'webp';
  if (mime === 'application/pdf' && signature([37, 80, 68, 70, 45])) return 'pdf';
  return null;
}
