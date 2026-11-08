'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconCalendar,
  IconDownload,
  IconDrag,
  IconImage,
  IconLayers,
  IconPlus,
  IconSparkles,
  IconZap,
} from '@/components/icons';
import InstagramMock from '@/components/InstagramMock';
import { MediaThumb } from '@/components/MediaThumb';
import PostEditor from '@/components/PostEditor';
import { EmptyState, PageHead, Segmented, Spinner } from '@/components/ui';
import { formatShortDate, formatTime, relativeDay } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { MediaItem, Post, PostStatus, Profile } from '@/lib/types';

type Filter = 'all' | PostStatus;

export default function PlannerPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<'profile' | 'post'>('profile');
  const [filter, setFilter] = useState<Filter>('all');
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);

  const load = useCallback(async () => {
    const [postsResponse, mediaResponse, profileResponse] = await Promise.all([
      fetch('/api/posts'),
      fetch('/api/media'),
      fetch('/api/profile'),
    ]);
    const postsData = await postsResponse.json();
    const mediaData = await mediaResponse.json();
    const profileData = await profileResponse.json();
    setPosts(postsData.posts ?? []);
    setMedia(mediaData.media ?? []);
    setProfile(profileData.profile ?? null);
    setLoading(false);
    return postsData.posts as Post[];
  }, []);

  useEffect(() => {
    const wanted = Number(searchParams.get('post'));
    load().then((items) => {
      if (!items?.length) return;
      if (Number.isFinite(wanted) && wanted > 0 && items.some((item) => item.id === wanted)) {
        setSelectedId(wanted);
        return;
      }
      setSelectedId(items[0].id);
    });
  }, [load, searchParams]);

  const activePost = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId]
  );

  const visiblePosts = useMemo(
    () => (filter === 'all' ? posts : posts.filter((post) => post.status === filter)),
    [posts, filter]
  );

  const counts = useMemo(
    () => ({
      all: posts.length,
      draft: posts.filter((post) => post.status === 'draft').length,
      scheduled: posts.filter((post) => post.status === 'scheduled').length,
      published: posts.filter((post) => post.status === 'published').length,
    }),
    [posts]
  );

  const handleSaved = (saved: Post) => {
    setPosts((current) => {
      const exists = current.some((post) => post.id === saved.id);
      if (!exists) return [...current, saved];
      return current.map((post) => (post.id === saved.id ? saved : post));
    });
    setSelectedId(saved.id);
    setCreating(false);
  };

  const handleDeleted = (id: number) => {    setPosts((current) => current.filter((post) => post.id !== id));
    setSelectedId((current) => {
      if (current !== id) return current;
      const remaining = posts.filter((post) => post.id !== id);
      return remaining[0]?.id ?? null;
    });
  };

  const navigatePost = (direction: -1 | 1) => {
    if (!posts.length) return;
    const index = posts.findIndex((post) => post.id === selectedId);
    const next = posts[(index + direction + posts.length) % posts.length];
    if (next) {
      setSelectedId(next.id);
      setCreating(false);
    }
  };

  const reorder = async (ids: number[]) => {
    setPosts((current) =>
      ids
        .map((id, index) => {
          const post = current.find((item) => item.id === id);
          return post ? { ...post, position: index } : null;
        })
        .filter(Boolean) as Post[]
    );
    await fetch('/api/posts/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  };

  /** Moves `draggedId` to the slot of `targetId` – used by the list and the grid. */
  const movePost = (draggedId: number | null, targetId: number) => {
    const source = draggedId ?? dragId;
    setDragging(false);
    if (source == null || source === targetId) return;
    const ids = posts.map((post) => post.id);
    const from = ids.indexOf(source);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, source);
    setDragId(null);
    reorder(next);
    toast('Feed order updated');
  };

  const sortByDate = async () => {
    const response = await fetch('/api/posts/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sort-by-date' }),
    });
    const data = await response.json();
    setPosts(data.posts ?? posts);
    toast('Sorted by date');
  };

  const snapshot = async () => {
    setSnapshotting(true);
    try {
      const { toPng } = await import('html-to-image');
      const node = document.getElementById('instagram-mock');
      if (!node) throw new Error('Preview not found');
      const dataUrl = await toPng(node as HTMLElement, {
        pixelRatio: 2,
        backgroundColor: '#06060a',
        cacheBust: true,
        skipFonts: true,
      });
      const link = document.createElement('a');
      link.download = `dechire-feed-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast('Feed snapshot saved as PNG');
    } catch (error) {
      console.error(error);
      toast('Snapshot failed', 'error');
    } finally {
      setSnapshotting(false);
    }
  };

  if (loading || !profile) {
    return <Spinner label="Loading feed" />;
  }

  return (
    <>
      <PageHead
        eyebrow="Instagram Planner"
        title={
          <>
            Feed<span className="slash">/</span>Planning
          </>
        }
        sub="Create posts, write captions, pick a song – and see in the preview exactly how your profile will look."
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={sortByDate}>
              <IconCalendar size={15} />
              By date
            </button>
            <button type="button" className="btn btn-ghost" onClick={snapshot} disabled={snapshotting}>
              <IconImage size={15} />
              {snapshotting ? 'Rendering …' : 'Feed as PNG'}
            </button>
            <a className="btn" href="/api/export/plan">
              <IconDownload size={15} />
              Plan as ZIP
            </a>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
                setMode('post');
              }}
            >
              <IconPlus size={15} />
              New post
            </button>
          </>
        }
      />

      <div className="planner-layout">
        <div className="planner-col">
          {creating || activePost ? (
            <PostEditor
              key={creating ? 'new' : activePost?.id}
              post={creating ? null : activePost}
              creating={creating}
              media={media}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onUploaded={(items) => setMedia((current) => [...items, ...current])}
              onCancelCreate={() => {
                setCreating(false);
                setSelectedId(posts[0]?.id ?? null);
              }}
            />
          ) : (
            <div className="panel">
              <EmptyState
                icon={<IconSparkles size={24} />}
                title="No post selected"
                hint="Pick a card from the list or create a new post."
                action={
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setCreating(true)}
                  >
                    <IconPlus size={14} /> New post
                  </button>
                }
              />
            </div>
          )}
        </div>

        <div className="planner-col preview-col">
          <div className="preview-toolbar">
            <Segmented
              value={mode}
              onChange={(value) => setMode(value)}
              options={[
                { value: 'profile', label: 'Profile grid' },
                { value: 'post', label: 'Single post' },
              ]}
            />
            <span className="mono small muted">
              {mode === 'profile' ? 'click a tile' : activePost ? `#${activePost.id} · use ‹ ›` : 'no post'}
            </span>
          </div>
          <InstagramMock
            profile={profile}
            posts={posts}
            mode={mode}
            activePost={activePost}
            showStatus
            onSelectPost={(id) => {
              setSelectedId(id);
              setCreating(false);
              setMode('post');
            }}
            onReorder={(dragged, target) => movePost(dragged, target)}
            onPrev={() => navigatePost(-1)}
            onNext={() => navigatePost(1)}
          />
          <p className="preview-hint">
            <IconSparkles size={13} />
            Click a tile for the single post · drag a tile to move it in the grid
          </p>
        </div>

        <div className="planner-col queue-col">
          <div className="panel queue-panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconLayers size={16} />
                Feed order
              </div>
              <span className="queue-count mono">{posts.length}</span>
            </div>

            <div className="queue-filter">
              <Segmented
                value={filter}
                onChange={(value) => setFilter(value)}
                options={[
                  { value: 'all', label: `All ${counts.all}` },
                  { value: 'draft', label: `Draft ${counts.draft}` },
                  { value: 'scheduled', label: `Scheduled ${counts.scheduled}` },
                ]}
              />
            </div>

            {visiblePosts.length && filter === 'all' ? (
              <div className="queue-top-label">
                <span className="mono">Top left in your profile</span>
              </div>
            ) : null}

            <div className="queue-list">
              {visiblePosts.length === 0 ? (
                <EmptyState
                  icon={<IconCalendar size={22} />}
                  title="Nothing in this filter"
                  hint="Change the filter or create a new post."
                />
              ) : (
                visiblePosts.map((post, index) => {
                  const isActive = !creating && post.id === selectedId;
                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', String(post.id));
                        event.dataTransfer.effectAllowed = 'move';
                        setDragId(post.id);
                        setDragging(true);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragging(false);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => movePost(dragId, post.id)}
                      onClick={() => {
                        setCreating(false);
                        setSelectedId(post.id);
                        setMode('post');
                      }}
                      className={`queue-item ${isActive ? 'active' : ''} ${dragId === post.id ? 'dragging' : ''}`}
                      title={`${post.caption?.split('\n')[0]?.trim() || 'Untitled post'} – drag to move`}
                    >
                      <span className="queue-grip" aria-hidden="true">
                        <IconDrag size={12} />
                      </span>

                      <span className="queue-thumb">
                        <MediaThumb media={post.media[0]} className="queue-thumb-img" />
                        <span className="queue-slot">{index + 1}</span>
                      </span>

                      <span className="queue-info">
                        <span className="queue-caption">
                          {post.caption?.split('\n')[0]?.trim() || 'Untitled post'}
                        </span>
                        <span className="queue-meta">
                          <span className={`queue-dot ${post.status}`} aria-hidden="true" />
                          <span className="queue-status">
                            {post.status === 'draft' ? 'Draft' : post.status === 'scheduled' ? 'Scheduled' : 'Published'}
                          </span>
                          <span className="queue-date">
                            {post.scheduledAt
                              ? `${formatShortDate(post.scheduledAt)} · ${formatTime(post.scheduledAt)}`
                              : 'no date'}
                          </span>
                          {post.igError ? (
                            <span className="queue-error" title={post.igError}>
                              <IconZap size={11} /> error
                            </span>
                          ) : null}
                        </span>
                      </span>

                      <a
                        className="queue-export"
                        href={`/api/export/post/${post.id}`}
                        onClick={(event) => event.stopPropagation()}
                        title="Export this post as ZIP"
                      >
                        <IconDownload size={14} />
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            <div className="queue-foot">
              <span className="mono">
                {dragging ? 'Drop where it belongs' : 'Drag here or in the grid'}
              </span>
              {dragging ? <span className="chip accent">Reordering</span> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
