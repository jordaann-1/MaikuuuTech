import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const geist = localFont({
  src: './fonts/Geist.woff2',
  variable: '--font-geist',
  display: 'swap',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMono.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
  weight: '100 900',
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'MaikuuuTech — Developer Portfolio', template: '%s | MaikuuuTech' },
  description: 'The personal developer portfolio of MaikuuuTech.',
};
export const viewport: Viewport = { themeColor: '#0b0d12', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('maikuuu-theme')==='light'?'light':'dark'}catch(e){}",
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
