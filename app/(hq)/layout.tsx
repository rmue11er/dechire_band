import type { Metadata } from 'next';
import CommandPalette from '@/components/CommandPalette';
import SchedulerHeartbeat from '@/components/SchedulerHeartbeat';
import Sidebar from '@/components/Sidebar';
import ToastHost from '@/components/ToastHost';

export const metadata: Metadata = {
  title: 'DECHIRE · Band HQ',
  description: 'Instagram planning, media library and notes for DECHIRE. Post-hardcore, black on lavender.',
};

/** The internal workspace: sidebar, palette, toasts – everything the public site skips. */
export default function HqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
      <CommandPalette />
      <SchedulerHeartbeat />
      <ToastHost />
    </>
  );
}
