import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const excluded = new Set([
  'node_modules',
  '.git',
  '.next',
  '.open-next',
  '.wrangler',
  '.local',
  'coverage',
  'test-results',
  'playwright-report',
]);
const patterns = [
  /\bsb_secret_[A-Za-z0-9_-]{16,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
];
const findings = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(file);
      continue;
    }
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (entry.name.startsWith('.dev.vars') && entry.name !== '.dev.vars.example') continue;
    if (!/\.(?:[cm]?[jt]sx?|jsonc?|md|sql|ya?ml|toml|txt|example)$/.test(entry.name)) continue;
    const content = await readFile(file, 'utf8');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) findings.push(path.relative(root, file));
    }
  }
}
await scan(root);
if (findings.length) {
  console.error('FAIL: Possible secrets in:', [...new Set(findings)].join(', '));
  process.exitCode = 1;
} else
  console.log(
    'PASS: No recognized secret patterns in publishable source. This is a heuristic scan; review git diff before publishing.',
  );
