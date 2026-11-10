import type { Metadata, Viewport } from 'next';
import { getSiteData } from '@/lib/site';
import '@/styles/site.css';

export const dynamic = 'force-dynamic';

/** Metadata comes from the database, so the tab/title always matches what is published. */
export async function generateMetadata(): Promise<Metadata> {
  const { settings, bandName } = getSiteData();
  const description =
    settings.seoDescription ||
    settings.tagline ||
    'Emotional Post-Hardcore aus Augsburg. Vier Leute, ein paar Songs, kein großer Plan.';
  return {
    title: settings.published ? bandName : `${bandName} · soon`,
    description,
    robots: settings.published ? undefined : { index: false, follow: false },
    openGraph: {
      title: bandName,
      description,
      type: 'website',
      images: settings.heroUrl ? [settings.heroUrl] : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#060509',
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
