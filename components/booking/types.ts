import type {
  BookingContact,
  BookingOutreach,
  BookingProfile,
  BookingStep,
  BookingTemplate,
} from '@/lib/types';

export type MailboxState = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: number;
  hasPassword: boolean;
  fromEnv: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean;
  lastTestError: string;
  configured: boolean;
};

export type QueueState = {
  queued: number;
  running: boolean;
  sentToday: number;
  limit: number;
  configured: boolean;
};

export type BookingData = {
  contacts: BookingContact[];
  templates: BookingTemplate[];
  steps: BookingStep[];
  outreach: BookingOutreach[];
  profile: BookingProfile;
  mail: MailboxState;
  queue: QueueState;
  seedsAvailable: number;
  /** researched contacts that are not in the list yet */
  seedMissing: number;
  bandName: string;
};

export type BookingTab = 'guide' | 'contacts' | 'templates' | 'mail';
