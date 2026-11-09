import type { Metadata, Viewport } from 'next';
import PaletteProvider from '@/components/PaletteProvider';
import { accentCss } from '@/lib/palette';
import { getProfile } from '@/lib/repo';
import '@fontsource/anton/latin-400.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/archivo-black/latin-400.css';
import '@fontsource/oswald/latin-300.css';
import '@fontsource/oswald/latin-500.css';
import '@fontsource/oswald/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-900.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
// Post-hardcore voice: fragile serifs, typewriter, handwriting, condensed caps.
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/bodoni-moda/latin-400.css';
import '@fontsource/bodoni-moda/latin-700.css';
import '@fontsource/bodoni-moda/latin-400-italic.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/special-elite/latin-400.css';
import '@fontsource/caveat/latin-400.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/archivo-narrow/latin-400.css';
import '@fontsource/archivo-narrow/latin-700.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/spectral/latin-300.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'DECHIRE · Band HQ',
  description: 'Instagram planning, media library and notes for DECHIRE. Post-hardcore, black on lavender.',
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
