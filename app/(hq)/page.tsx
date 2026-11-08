'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  IconCalendar,
  IconClock,
  IconDownload,
  IconImage,
  IconLayers,
  IconMusic,
  IconNote,
  IconPlus,
  IconSparkles,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import { PageHead, Spinner, StatusBadge } from '@/components/ui';
import { compactNumber, formatBytes, formatTime, relativeDay, timeAgo } from '@/lib/format';
import type { MediaItem, Note, Post, Profile, Stats } from '@/lib/types';

type Dashboard = {
  stats: Stats;
  posts: Post[];
  media: MediaItem[];
  notes: Note[];
  profile: Profile;
  insight: { weekday: number; reach: number; samples: number }[];
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date())
    );
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((response) => response.json()),
      fetch('/api/posts').then((response) => response.json()),
      fetch('/api/media').then((response) => response.json()),
      fetch('/api/notes').then((response) => response.json()),
      fetch('/api/profile').then((response) => response.json()),
      fetch('/api/metrics').then((response) => response.json()),
    ]).then(([stats, posts, media, notes, profile, metrics]) => {
      setData({
        stats,
        posts: posts.posts ?? [],
        media: media.media ?? [],
        notes: notes.notes ?? [],
        profile: profile.profile,
        insight: metrics.insight ?? [],
      });
    });
  }, []);

  if (!data) return <Spinner label="Starting Band HQ" />;

  const { stats, posts, media, notes, profile, insight } = data;
  const feed = posts.slice(0, 9);
  const measured = posts.filter((post) => post.metrics && post.metrics.reach > 0);
  const totalReach = measured.reduce((sum, post) => sum + (post.metrics?.reach ?? 0), 0);
  const totalLikes = measured.reduce((sum, post) => sum + (post.metrics?.likes ?? 0), 0);
  const topPost = [...measured].sort((a, b) => (b.metrics?.reach ?? 0) - (a.metrics?.reach ?? 0))[0];
  const bestDay = insight[0];
  const upcoming = posts
    .filter((post) => post.status === 'scheduled' && post.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 4);

  return (
    <>
      <PageHead
        eyebrow={`${today || 'Band HQ'} /// ${profile.handle}`}
        title={
          <>
            Band<span className="slash">/</span>HQ
          </>
        }
        sub={`${compactNumber(profile.followers)} followers. ${posts.length} posts planned. ${media.length} assets archived. All in one place.`}
        actions={
          <>
            <Link className="btn btn-ghost" href="/media">
              <IconImage size={15} />
              Media
            </Link>
            <Link className="btn btn-ghost" href="/studio">
              <IconSparkles size={15} />
              Design
            </Link>
            <a className="btn btn-ghost" href="/api/export/plan">
              <IconDownload size={15} />
              Full export
            </a>
            <Link className="btn btn-primary" href="/planner">
              <IconPlus size={15} />
              Plan a post
            </Link>
          </>
        }
      />

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <IconCalendar size={17} />
          </span>
          <div>
            <div className="stat-value">{stats.posts.planned}</div>
            <div className="stat-label">Scheduled posts</div>
          </div>
          <span className="stat-hint">
            {stats.posts.drafts} {stats.posts.drafts === 1 ? 'draft' : 'drafts'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <IconSparkles size={17} />
          </span>
          <div>
            <div className="stat-value">{stats.posts.published}</div>
            <div className="stat-label">Published</div>
          </div>
          <span className="stat-hint">{stats.posts.total} total</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <IconLayers size={17} />
          </span>
          <div>
            <div className="stat-value">{stats.media.total}</div>
            <div className="stat-label">Media</div>
          </div>
          <span className="stat-hint">
            {stats.media.groups} groups · {formatBytes(stats.media.storage)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <IconNote size={17} />
          </span>
          <div>
            <div className="stat-value">{stats.notes.total}</div>
            <div className="stat-label">Notes</div>
          </div>
          <span className="stat-hint">last {timeAgo(notes[0]?.updatedAt)}</span>
        </div>
      </div>

      <div className="perf-strip">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Performance</div>
            <span className="mono small muted">{measured.length} posts measured</span>
          </div>
          <div className="panel-body perf-strip-body">
            <div className="perf-stat">
              <strong>{totalReach.toLocaleString('en-GB')}</strong>
              <span className="mono small muted">reach</span>
            </div>
            <div className="perf-stat">
              <strong>{totalLikes.toLocaleString('en-GB')}</strong>
              <span className="mono small muted">likes</span>
            </div>
            <div className="perf-stat">
              <strong>
                {measured.length
                  ? Math.round(totalReach / measured.length).toLocaleString('en-GB')
                  : '—'}
              </strong>
              <span className="mono small muted">avg. reach</span>
            </div>
            <div className="perf-stat">
              <strong>{bestDay ? WEEKDAY_NAMES[bestDay.weekday] : '—'}</strong>
              <span className="mono small muted">
                {bestDay ? `best day · ${bestDay.reach.toLocaleString('en-GB')} avg` : 'best day'}
              </span>
            </div>
            {topPost ? (
              <Link href={`/planner?post=${topPost.id}`} className="perf-top">
                <span className="mono small muted">top post</span>
                <span className="truncate">{topPost.caption.split('\n')[0].slice(0, 48) || 'Post'}</span>
                <span className="mono small muted">{(topPost.metrics?.reach ?? 0).toLocaleString('en-GB')}</span>
              </Link>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>
                No numbers yet – publish a post and sync the insights in the planner.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="dash-grid">
        <section className="panel dash-panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconClock size={16} />
              Next up
            </div>
            <Link className="mono small" href="/planner">
              Planner →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="panel-body muted small">
              Nothing scheduled. Time to build the next post.
            </div>
          ) : (
            <div className="next-list">
              {upcoming.map((post) => {
                const date = new Date(post.scheduledAt!);
                return (
                  <Link key={post.id} href="/planner" className="next-item">
                    <span className="next-date">
                      <strong>{String(date.getDate()).padStart(2, '0')}</strong>
                      <span>
                        {new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date).replace('.', '')}
                      </span>
                    </span>
                    <span className="next-thumb">
                      <MediaThumb media={post.media[0]} className="next-thumb-img" />
                    </span>
                    <span className="next-info">
                      <span className="next-caption truncate">
                        {post.caption?.split('\n')[0]?.trim() || 'Ohne Caption'}
                      </span>
                      <span className="next-meta">
                        <span className="mono">
                          {relativeDay(post.scheduledAt)} · {formatTime(post.scheduledAt)}
                        </span>
                        <StatusBadge status={post.status} />
                      </span>
                    </span>
                    {post.songTitle ? (
                      <span className="next-song mono truncate">
                        <IconMusic size={11} /> {post.songTitle}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel dash-panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconImage size={16} />
              Feed preview
            </div>
            <Link className="mono small" href="/planner">
              Preview →
            </Link>
          </div>
          <div className="dash-feed">
            {feed.map((post) => (
              <div key={post.id} className="dash-feed-tile">
                <MediaThumb media={post.media[0]} className="dash-feed-img" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 9 - feed.length) }).map((_, index) => (
              <div key={`empty-${index}`} className="dash-feed-tile empty" />
            ))}
          </div>
        </section>

        <section className="panel dash-panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconLayers size={16} />
              Recently added
            </div>
            <Link className="mono small" href="/media">
              Library →
            </Link>
          </div>
          <div className="dash-media">
            {media.slice(0, 6).map((item) => (
              <Link key={item.id} href="/media" className="dash-media-item" title={item.title}>
                <MediaThumb media={item} className="dash-media-img" />
                <span className="dash-media-label truncate">{item.variantLabel || item.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel dash-panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconNote size={16} />
              Notes
            </div>
            <Link className="mono small" href="/notes">
              All →
            </Link>
          </div>
          <div className="dash-notes">
            {notes.slice(0, 4).map((note) => (
              <Link key={note.id} href="/notes" className="dash-note">
                <span className="dash-note-title truncate">{note.title}</span>
                <span className="dash-note-meta mono">
                  {note.folder} · {timeAgo(note.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
