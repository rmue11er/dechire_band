import type { Metadata, Viewport } from 'next';
import PaletteProvider from '@/components/PaletteProvider';
import { accentCss } from '@/lib/palette';
import { getProfile } from '@/lib/repo';
// Three fonts, nothing else: Redaction, Instrument Sans, DM Mono.
import './globals.css';

export const metadata: Metadata = {
  title: 'déchire · Band HQ',
  description: 'Emotional post-hardcore from Augsburg – planning, media, words. Dark, quiet, no big production.',
};

export const viewport: Viewport = {
  themeColor: '#06060a',
};

/** The accent colour lives in the database, so every render has to read it fresh. */
export const dynamic = 'force-dynamic';

/**
 * Only the document shell lives here. The HQ chrome (sidebar, command palette,
 * toasts) sits in `app/(hq)/layout.tsx`, so the public website can use its own
 * frame without sidebars and toolbar noise.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = getProfile();

  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: accentCss(profile.accentHex, profile.accent2Hex) }}
        />
      </head>
      <body>
        <PaletteProvider accentHex={profile.accentHex} accent2Hex={profile.accent2Hex}>
          {children}
        </PaletteProvider>
      </body>
    </html>
  );
}
