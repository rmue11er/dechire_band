'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconDocument,
  IconMusic,
  IconNote,
  IconPlus,
  IconSparkles,
  IconUpload,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import { PageHead, Spinner, StatusBadge } from '@/components/ui';
import { compactNumber, formatTime, relativeDay, timeAgo } from '@/lib/format';
import type { MediaItem, Milestone, Post, Profile } from '@/lib/types';

type Insight = { weekday: number; reach: number; samples: number }[];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const KIND_LABEL: Record<string, string> = {
  release: 'Release',
  show: 'Show',
  deadline: 'Deadline',
  meeting: 'Meeting',
  content: 'Content',
  other: 'Date',
};

type Entry = {
  key: string;
  date: Date;
  title: string;
  meta: string;
  href: string;
  tone: 'post' | 'milestone';
  status?: string;
  thumb?: MediaItem;
};

type Task = {
  key: string;
  label: string;
  detail: string;
  href: string;
  tone: 'warn' | 'info';
  days?: number;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const dayDistance = (date: Date) => Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);

const shortMonth = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date).replace('.', '');

const shortWeekday = (date: Date) => new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [insight, setInsight] = useState<Insight>([]);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(new Date())
    );
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/posts').then((response) => response.json()),
      fetch('/api/milestones').then((response) => response.json()),
      fetch('/api/profile').then((response) => response.json()),
      fetch('/api/metrics').then((response) => response.json()),
    ])
      .then(([postsData, milestoneData, profileData, metricsData]) => {
        setPosts(postsData.posts ?? []);
        setMilestones(milestoneData.milestones ?? []);
        setProfile(profileData.profile ?? null);
        setInsight(metricsData.insight ?? []);
      })
      .catch(() => setPosts([]));
  }, []);

  if (!posts) return <Spinner label="Starting Band HQ" />;

  const handle = profile?.handle ?? 'dechire.band';

  /* ---------------------------------------------------------------- upcoming */

  const upcoming: Entry[] = [
    ...posts
      .filter((post) => post.status === 'scheduled' && post.scheduledAt)
      .map<Entry>((post) => ({
        key: `post-${post.id}`,
        date: new Date(post.scheduledAt!),
        title: post.caption?.split('\n')[0]?.trim() || 'Post without caption',
        meta: `${shortWeekday(new Date(post.scheduledAt!))} · ${formatTime(post.scheduledAt)}`,
        href: `/planner?post=${post.id}`,
        tone: 'post',
        status: post.status,
        thumb: post.media[0],
      })),
    ...milestones
      .filter((milestone) => !milestone.done)
      .map<Entry>((milestone) => {
        const open = milestone.checklist.filter((item) => !item.done).length;
        return {
          key: `milestone-${milestone.id}`,
          date: new Date(milestone.date),
          title: milestone.title,
          meta: `${KIND_LABEL[milestone.kind] ?? 'Date'}${
            milestone.checklist.length ? ` · ${open}/${milestone.checklist.length} open` : ''
          }`,
          href: '/calendar',
          tone: 'milestone',
        };
      }),
  ]
    .filter((entry) => !Number.isNaN(entry.date.getTime()) && dayDistance(entry.date) >= -1)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  /* --------------------------------------------------------- needs attention */

  const tasks: Task[] = [];

  for (const post of posts.filter((entry) => entry.status === 'draft')) {
    const hasMedia = post.media.length > 0;
    const hasCaption = Boolean(post.caption?.trim());
    tasks.push({
      key: `draft-${post.id}`,
      label: post.caption?.split('\n')[0]?.trim() || 'Draft without caption',
      detail: !hasMedia
        ? 'Draft · no visual yet'
        : !hasCaption
          ? 'Draft · caption missing'
          : 'Draft · not scheduled yet',
      href: `/planner?post=${post.id}`,
      tone: !hasMedia || !hasCaption ? 'warn' : 'info',
    });
  }

  for (const post of posts.filter((entry) => entry.status === 'scheduled' && entry.scheduledAt)) {
    const days = dayDistance(new Date(post.scheduledAt!));
    if (days >= 0 && days <= 3 && post.media.length === 0) {
      tasks.push({
        key: `media-${post.id}`,
        label: post.caption?.split('\n')[0]?.trim() || 'Scheduled post',
        detail: `Goes live ${relativeDay(post.scheduledAt).toLowerCase()} · no media attached`,
        href: `/planner?post=${post.id}`,
        tone: 'warn',
        days,
      });
    }
  }

  for (const milestone of milestones.filter((entry) => !entry.done)) {
    const days = dayDistance(new Date(milestone.date));
    const open = milestone.checklist.filter((item) => !item.done).length;
    if (open > 0 && days <= 21) {
      tasks.push({
        key: `checklist-${milestone.id}`,
        label: milestone.title,
        detail: `${KIND_LABEL[milestone.kind] ?? 'Date'} · ${
          days < 0 ? `${Math.abs(days)} d overdue` : relativeDay(milestone.date).toLowerCase()
        } · ${open} task${open === 1 ? '' : 's'} open`,
        href: '/calendar',
        tone: days < 0 || days <= 3 ? 'warn' : 'info',
        days,
      });
    }
  }

  const attention = tasks.sort((a, b) => (a.days ?? 99) - (b.days ?? 99)).slice(0, 5);

  /* ------------------------------------------------------------- performance */

  const measured = posts.filter((post) => post.metrics && post.metrics.reach > 0);
  const totalReach = measured.reduce((sum, post) => sum + (post.metrics?.reach ?? 0), 0);
  const bestDay = insight[0];
  const lastPublished = [...posts]
    .filter((post) => post.publishedAt)
    .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime())[0];

  const scheduledCount = posts.filter((post) => post.status === 'scheduled').length;
  const nextEntry = upcoming[0];

  return (
    <>
      <PageHead
        eyebrow={`${today || 'Band HQ'} /// ${handle}`}
        title={
          <>
            Band<span className="slash">/</span>HQ
          </>
        }
        sub={
          <>
            {scheduledCount} post{scheduledCount === 1 ? '' : 's'} queued
            {nextEntry
              ? ` · next ${nextEntry.date.getDate()} ${shortMonth(nextEntry.date).toLowerCase()}: ${nextEntry.title.slice(0, 34)}`
              : ''}
            {attention.length
              ? ` · ${attention.length} thing${attention.length === 1 ? '' : 's'} need${attention.length === 1 ? 's' : ''} you`
              : ''}
          </>
        }
        actions={
          <>
            <Link className="btn btn-ghost" href="/calendar">
              <IconCalendar size={15} />
              Calendar
            </Link>
            <Link className="btn btn-ghost" href="/media">
              <IconUpload size={15} />
              Media
            </Link>
            <Link className="btn btn-primary" href="/planner">
              <IconPlus size={15} />
              Plan a post
            </Link>
          </>
        }
      />

      <div className="dash-two">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconClock size={16} />
              Coming up
            </div>
            <Link className="mono small" href="/calendar">
              Calendar →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="dash-empty">
              <p className="muted small">Nothing scheduled or dated. Plan the next post or drop a release date.</p>
              <Link className="btn btn-sm btn-primary" href="/planner">
                <IconPlus size={14} /> Plan a post
              </Link>
            </div>
          ) : (
            <ul className="timeline">
              {upcoming.map((entry) => (
                <li key={entry.key}>
                  <Link href={entry.href} className={`timeline-row ${entry.tone}`}>
                    <span className="timeline-date">
                      <strong>{String(entry.date.getDate()).padStart(2, '0')}</strong>
                      <span>{shortMonth(entry.date)}</span>
                    </span>

                    {entry.thumb ? (
                      <span className="timeline-thumb">
                        <MediaThumb media={entry.thumb} className="timeline-thumb-img" />
                      </span>
                    ) : (
                      <span className="timeline-icon">
                        {entry.tone === 'milestone' ? <IconSparkles size={14} /> : <IconNote size={14} />}
                      </span>
                    )}

                    <span className="timeline-main">
                      <span className="timeline-title truncate">{entry.title}</span>
                      <span className="timeline-meta mono">{entry.meta}</span>
                    </span>

                    <span className="timeline-side">
                      {entry.status ? <StatusBadge status={entry.status} /> : null}
                      <span className="timeline-day mono">{relativeDay(entry.date.toISOString())}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="dash-side">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconCheck size={16} />
                Needs you
              </div>
              <span className="mono small muted">{attention.length || 'nothing'} open</span>
            </div>

            {attention.length === 0 ? (
              <div className="dash-empty">
                <p className="muted small">All clean. Every draft has a visual, every date has a plan.</p>
              </div>
            ) : (
              <ul className="attention">
                {attention.map((task) => (
                  <li key={task.key}>
                    <Link href={task.href} className={`attention-row ${task.tone}`}>
                      <span className="attention-dot" aria-hidden="true" />
                      <span className="attention-main">
                        <span className="attention-title truncate">{task.label}</span>
                        <span className="attention-detail">{task.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

            <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconMusic size={16} />
                Performance
              </div>
              <span className="mono small muted">
                {measured.length ? `${measured.length} posts measured` : 'no data yet'}
              </span>
            </div>
            <div className="panel-body perf-row">
              {measured.length === 0 ? (
                <p className="muted small" style={{ margin: 0 }}>
                  Publish a post and sync the insights in the planner – reach, likes and the best weekday show up here.
                </p>
              ) : (
                <>
                  <div className="perf-stat">
                    <strong>{totalReach.toLocaleString('en-GB')}</strong>
                    <span className="mono small muted">reach total</span>
                  </div>
                  <div className="perf-stat">
                    <strong>{Math.round(totalReach / measured.length).toLocaleString('en-GB')}</strong>
                    <span className="mono small muted">ø reach</span>
                  </div>
                  <div className="perf-stat">
                    <strong>{bestDay ? WEEKDAY_NAMES[bestDay.weekday] : '—'}</strong>
                    <span className="mono small muted">best weekday</span>
                  </div>
                  {lastPublished ? (
                    <Link href={`/planner?post=${lastPublished.id}`} className="perf-last">
                      <span className="mono small muted">last published</span>
                      <span className="truncate">
                        {lastPublished.caption.split('\n')[0].slice(0, 46) || 'Post'}
                      </span>
                      <span className="mono small muted">{timeAgo(lastPublished.publishedAt)}</span>
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconDocument size={16} />
            Shortcuts
          </div>
          <span className="mono small muted">
            {compactNumber(profile?.followers ?? 0)} followers · {posts.length} posts · {milestones.length} dates
          </span>
        </div>
        <div className="panel-body quick-links">
          <Link href="/docs" className="quick-link">
            <IconDocument size={15} />
            <span>
              <strong>Documents</strong>
              <em className="mono small muted">rider, contracts, press</em>
            </span>
          </Link>
          <Link href="/studio" className="quick-link">
            <IconSparkles size={15} />
            <span>
              <strong>Design studio</strong>
              <em className="mono small muted">stories, posters, covers</em>
            </span>
          </Link>
          <Link href="/notes" className="quick-link">
            <IconNote size={15} />
            <span>
              <strong>Notes</strong>
              <em className="mono small muted">lyrics, ideas, setlists</em>
            </span>
          </Link>
          <Link href="/website" className="quick-link">
            <IconMusic size={15} />
            <span>
              <strong>Website</strong>
              <em className="mono small muted">the public one-pager</em>
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
