import { MAX_ATTACHMENT_SIZE } from './inquiries';
import { detectFile } from './uploads';
const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function validDocx(bytes: Uint8Array) {
  if (bytes.length < 22 || bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4)
    return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0)
    return false;
  const entries = view.getUint16(end + 10, true),
    start = view.getUint32(end + 16, true);
  if (entries < 2 || entries > 200 || start >= end) return false;
  let offset = start,
    total = 0;
  const names = new Set<string>();
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) return false;
    const flags = view.getUint16(offset + 8, true),
      compressed = view.getUint32(offset + 20, true),
      size = view.getUint32(offset + 24, true),
      nameLength = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true),
      local = view.getUint32(offset + 42, true);
    if (
      flags & 1 ||
      offset + 46 + nameLength + extra + comment > end ||
      local + 30 > start ||
      view.getUint32(local, true) !== 0x04034b50
    )
      return false;
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (
      name.includes('..') ||
      name.startsWith('/') ||
      name.includes('\\') ||
      /vbaProject|embeddings\/|customUI\/|\.exe$|\.js$/i.test(name)
    )
      return false;
    const localName = view.getUint16(local + 26, true),
      localExtra = view.getUint16(local + 28, true);
    if (local + 30 + localName + localExtra + compressed > start) return false;
    if (new TextDecoder().decode(bytes.slice(local + 30, local + 30 + localName)) !== name)
      return false;
    total += size;
    if (total > 25 * 1024 * 1024) return false;
    names.add(name);
    offset += 46 + nameLength + extra + comment;
  }
  return names.has('[Content_Types].xml') && names.has('word/document.xml');
}
export function attachmentExtension(bytes: Uint8Array, mime: string): string | null {
  if (!bytes.length || bytes.length > MAX_ATTACHMENT_SIZE) return null;
  const existing = detectFile(bytes, mime);
  if (existing) return existing;
  if (mime === docxMime && validDocx(bytes)) return 'docx';
  if (mime === 'text/plain' && bytes.length <= 1024 * 1024 && !bytes.includes(0)) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return 'txt';
    } catch {
      return null;
    }
  }
  return null;
}
export function safeAttachmentName(name: string, extension: string) {
  const base =
    name
      .normalize('NFKC')
      .split(/[\\/]/)
      .pop()!
      .replace(/\.[^.]*$/, '')
      .replace(/[^\p{L}\p{N} ._()-]/gu, '_')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, 155) || 'attachment';
  return base + '.' + extension;
}
