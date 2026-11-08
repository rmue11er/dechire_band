'use client';

import { useEffect, useState } from 'react';
import { IconCheck, IconExternal, IconInstagram, IconZap } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Post, PostMetrics } from '@/lib/types';

type Status = { live: boolean; sandbox: boolean; username: string; hasToken: boolean };

const FIELDS: { key: keyof Omit<PostMetrics, 'postId' | 'source' | 'capturedAt'>; label: string }[] = [
  { key: 'reach', label: 'Reach' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'saves', label: 'Saves' },
  { key: 'shares', label: 'Shares' },
];

const empty = { reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 };

export default function PostPerformance({
  post,
  onUpdated,
}: {
  post: Post;
  onUpdated: (post: Post) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instagram')
      .then((response) => response.json())
      .then((data) => setStatus(data.connection ?? null))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (post.metrics) {
      setForm({
        reach: post.metrics.reach,
        likes: post.metrics.likes,
        comments: post.metrics.comments,
        saves: post.metrics.saves,
        shares: post.metrics.shares,
      });
    } else {
      setForm(empty);
    }
  }, [post.id, post.metrics]);

  const saveMetrics = async () => {
    setBusy('metrics');
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, postId: post.id, source: 'manual' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the numbers');
      onUpdated({ ...post, metrics: data.metrics });
      toast('Numbers saved');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the numbers', 'error');
    } finally {
      setBusy(null);
    }
  };

  const run = async (action: 'publish' | 'sync') => {
    setBusy(action);
    try {
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, postId: post.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Instagram request failed');

      if (action === 'publish') {
        onUpdated(data.post);
        toast(data.sandbox ? 'Published in sandbox mode (no real post)' : 'Published to Instagram');
      } else {
        const entry = data.results?.[0];
        if (entry?.metrics) onUpdated({ ...post, metrics: entry.metrics });
        toast(entry?.sandbox ? 'Insights synced (sandbox numbers)' : 'Insights synced from Instagram');
      }
    } catch (error: any) {
      toast(error.message ?? 'Instagram request failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="perf-block">
      <div className="perf-head">
        <span className="label">
          <IconInstagram size={12} /> Performance
        </span>
        <div className="row" style={{ gap: 6 }}>
          {post.igPermalink ? (
            <a className="btn btn-sm btn-ghost" href={post.igPermalink} target="_blank" rel="noreferrer">
              <IconExternal size={12} /> Instagram
            </a>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => run('publish')}
            disabled={!!busy || post.status === 'published'}
            title={
              post.status === 'published'
                ? 'Already published'
                : status?.live
                  ? 'Publish now via Instagram'
                  : 'Needs an Instagram connection (sandbox otherwise)'
            }
          >
            <IconZap size={12} /> {busy === 'publish' ? 'Publishing …' : 'Publish now'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => run('sync')}
            disabled={!!busy || !post.igMediaId}
            title={post.igMediaId ? 'Load reach and likes from Instagram' : 'No Instagram post linked yet'}
          >
            <IconInstagram size={12} /> {busy === 'sync' ? 'Syncing …' : 'Sync insights'}
          </button>
        </div>
      </div>

      <div className="perf-grid">
        {FIELDS.map((field) => (          <label className="perf-field" key={field.key}>
            <span className="mono">{field.label}</span>
            <input
              className="input"
              type="number"
              min={0}
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: Number(event.target.value) || 0 })}
            />
          </label>
        ))}
      </div>

      <div className="perf-foot">
        <span className="small muted">
          {post.metrics
            ? `${post.metrics.source === 'instagram' ? 'From Instagram' : 'Manual entry'} · ${new Date(
                post.metrics.capturedAt
              ).toLocaleDateString('en-GB')}`
            : status?.sandbox === false
              ? 'No numbers yet'
              : 'No numbers yet – sandbox mode active'}
        </span>
        <button type="button" className="btn btn-sm" onClick={saveMetrics} disabled={!!busy}>
          <IconCheck size={12} /> {busy === 'metrics' ? 'Saving …' : 'Save numbers'}
        </button>
      </div>

      {post.igError ? (
        <p className="perf-error">
          <IconZap size={12} /> {post.igError}
          {post.igLastAttempt ? ` · ${new Date(post.igLastAttempt).toLocaleString('en-GB')}` : ''}
        </p>
      ) : null}
    </div>
  );
}
