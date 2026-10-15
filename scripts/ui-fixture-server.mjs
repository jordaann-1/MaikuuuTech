// Isolated component fixtures. This server is never imported by, or deployed with, Next.js.
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
await mkdir('.local/ui-fixtures', { recursive: true });
await build({
  entryPoints: ['tests/ui/fixture.tsx'],
  bundle: true,
  outfile: '.local/ui-fixtures/app.js',
  format: 'esm',
  jsx: 'automatic',
  alias: {
    '@': resolve('src'),
    'next/link': resolve('tests/ui/next-link.tsx'),
    'next/navigation': resolve('tests/ui/next-navigation.ts'),
    'next/script': resolve('tests/ui/next-script.tsx'),
  },
  define: { 'process.env.NODE_ENV': '"development"' },
});
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), {
  from: resolve('src/app/globals.css'),
});
await writeFile('.local/ui-fixtures/style.css', css.css);
const html = `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated MaikuuuTech UI fixtures</title><link rel="stylesheet" href="/style.css"><style>@font-face{font-family:FixtureGeist;src:url('/Geist.woff2')}@font-face{font-family:FixtureMono;src:url('/GeistMono.woff2')}:root{--font-geist:FixtureGeist;--font-geist-mono:FixtureMono}</style><script>try{document.documentElement.dataset.theme=localStorage.getItem('maikuuu-theme')||'dark'}catch{}</script></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`;
const assets = {
  '/app.js': ['.local/ui-fixtures/app.js', 'text/javascript'],
  '/style.css': ['.local/ui-fixtures/style.css', 'text/css'],
  '/Geist.woff2': ['src/app/fonts/Geist.woff2', 'font/woff2'],
  '/GeistMono.woff2': ['src/app/fonts/GeistMono.woff2', 'font/woff2'],
};
createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1:3101').pathname;
    if (path.startsWith('/api/')) {
      response.writeHead(501, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          error: 'Isolated fixture APIs must be explicitly intercepted by the test.',
        }),
      );
      return;
    }
    const asset = assets[path];
    response.writeHead(200, {
      'Content-Type': asset ? asset[1] : 'text/html',
      'Cache-Control': 'no-store',
    });
    response.end(asset ? await readFile(asset[0]) : html);
  } catch {
    response.writeHead(500);
    response.end('Fixture server error');
  }
}).listen(3101, '127.0.0.1', () => console.log('Isolated UI fixtures: http://127.0.0.1:3101'));
