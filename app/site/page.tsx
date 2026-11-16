import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** The public page now lives at “/”. Keep the old URL working. */
export default function SiteRedirect() {
  redirect('/');
}
