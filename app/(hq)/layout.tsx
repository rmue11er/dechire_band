import type { Metadata } from 'next';
import CommandPalette from '@/components/CommandPalette';
import ContextBar from '@/components/ContextBar';
import SchedulerHeartbeat from '@/components/SchedulerHeartbeat';
import Sidebar from '@/components/Sidebar';
import ToastHost from '@/components/ToastHost';

export const metadata: Metadata = {
  title: 'déchire · Band HQ',
  description: 'Emotional Post-Hardcore aus Augsburg – Planung, Medien, Texte. Dunkel, warm, ohne großes Programm.',
};

/** The internal workspace: sidebar, palette, toasts – everything the public site skips. */
export default function HqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app">
        <Sidebar />
        <ContextBar />
        <main className="main">{children}</main>
      </div>
      <CommandPalette />
      <SchedulerHeartbeat />
      <ToastHost />
    </>
  );
}
