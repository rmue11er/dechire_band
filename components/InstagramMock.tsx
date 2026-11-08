'use client';

import { useEffect, useState } from 'react';
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconComment,
  IconDots,
  IconEye,
  IconFilm,
  IconGrid,
  IconHeart,
  IconLayers,
  IconMapPin,
  IconMusic,
  IconPlay,
  IconSearch,
  IconShare,
  IconSparkles,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import { compactNumber, formatDate } from '@/lib/format';
import type { Post, Profile } from '@/lib/types';

const likesFor = (post: Post) => 148 + ((post.id * 347) % 2400);
const commentsFor = (post: Post) => 4 + ((post.id * 13) % 48);

function StatusBar() {
  return (
    <div className="ig-statusbar">
      <span className="ig-time">9:41</span>
      <span className="ig-status-icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true">
          <path d="M8 9.8 1 3.4A10 10 0 0 1 15 3.4z" opacity=".95" />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="currentColor" opacity=".5" />
          <rect x="2" y="2" width="15" height="7" rx="1.6" fill="currentColor" />
          <path d="M22 4v3a2.4 2.4 0 0 0 0-3z" fill="currentColor" opacity=".5" />
        </svg>
      </span>
    </div>
  );
}

function TabBar({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <div className="ig-tabbar">
      <span className="ig-tab-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 9.5V21h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="ig-tab-icon">
        <IconSearch size={21} strokeWidth={1.7} />
      </span>
      <span className="ig-tab-icon">
        <IconFilm size={21} strokeWidth={1.7} />
      </span>
      <span className="ig-tab-icon">
        <IconShare size={21} strokeWidth={1.7} />
      </span>
      <span className="ig-tab-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span />}
      </span>
    </div>
  );
}

function ProfileView({
  profile,
  posts,
  showStatus,
  onSelectPost,
  onReorder,
  activeId,
}: {
  profile: Profile;
  posts: Post[];
  showStatus: boolean;
  onSelectPost?: (id: number) => void;
  /** Drag a tile onto another one to move it in the grid. */
  onReorder?: (draggedId: number, targetId: number) => void;
  activeId?: number | null;
}) {
  const highlights = profile.highlightNames.slice(0, 5);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const coverFor = (index: number) =>
    posts[index]?.media[0]?.url ?? posts[0]?.media[0]?.url ?? profile.avatarUrl;

  return (
    <div className="ig-profile">
      <div className="ig-topbar">
        <span className="ig-lock">
          <svg width="11" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 10V8a6 6 0 1 1 12 0v2h1.5A1.5 1.5 0 0 1 21 11.5v9A1.5 1.5 0 0 1 19.5 22h-15A1.5 1.5 0 0 1 3 20.5v-9A1.5 1.5 0 0 1 4.5 10zM8.5 10h7V8a3.5 3.5 0 1 0-7 0z" />
          </svg>
          {profile.handle}
        </span>
        <span className="ig-topbar-icons">
          <IconGrid size={19} strokeWidth={1.7} />
          <IconDots size={19} />
        </span>
      </div>

      <div className="ig-identity">
        <div className="ig-avatar-ring">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.bandName} /> : <span />}
        </div>
        <div className="ig-stats">
          <div>
            <strong>{posts.length}</strong>
            <span>posts</span>
          </div>
          <div>
            <strong>{compactNumber(profile.followers)}</strong>
            <span>Follower</span>
          </div>
          <div>
            <strong>{compactNumber(profile.following)}</strong>
            <span>following</span>
          </div>
        </div>
      </div>

      <div className="ig-bio">
        <div className="ig-name">
          {profile.bandName}
          {profile.handle ? <span className="ig-verified">✦</span> : null}
        </div>
        <div className="ig-bio-text">{profile.bio}</div>
        {profile.website ? <div className="ig-link">{profile.website}</div> : null}
      </div>

      {highlights.length ? (
        <div className="ig-highlights">
          {highlights.map((name, index) => (
            <button
              key={name}
              type="button"
              className="ig-highlight"
              onClick={() => setHighlightIndex(index)}
            >
              <span className={`ig-highlight-ring ${highlightIndex === index ? 'active' : ''}`}>
                {coverFor(index) ? <img src={coverFor(index)!} alt="" /> : <span>{name.slice(0, 2)}</span>}
              </span>
              <span className="ig-highlight-label">{name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="ig-grid-tabs">
        <span className="ig-grid-tab active">
          <IconGrid size={17} />
        </span>
        <span className="ig-grid-tab">
          <IconFilm size={17} />
        </span>
        <span className="ig-grid-tab">
          <IconLayers size={17} />
        </span>
      </div>

      <div className="ig-grid">
        {posts.length === 0 ? (
          <div className="ig-grid-empty">
            <IconSparkles size={26} />
            <p>No posts in your feed yet.</p>
            <span>Create your first post on the left.</span>
          </div>
        ) : (
          posts.map((post) => {
            const cover = post.media[0];
            return (
              <div
                key={post.id}
                role="button"
                tabIndex={0}
                draggable={Boolean(onReorder)}
                className={`ig-tile ${activeId === post.id ? 'active' : ''} ${
                  dragId === post.id ? 'dragging' : ''
                } ${overId === post.id && dragId !== post.id ? 'drop' : ''}`}
                onClick={() => onSelectPost?.(post.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectPost?.(post.id);
                  }
                }}
                title="Open this post · drag to reorder"
                aria-label="Open this post in the single post view"
                onDragStart={(event) => {
                  if (!onReorder) return;
                  event.dataTransfer.setData('text/plain', String(post.id));
                  event.dataTransfer.effectAllowed = 'move';
                  setDragId(post.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={(event) => {
                  if (!onReorder) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (overId !== post.id) setOverId(post.id);
                }}
                onDragLeave={() => setOverId((current) => (current === post.id ? null : current))}
                onDrop={(event) => {
                  if (!onReorder) return;
                  event.preventDefault();
                  const source = dragId ?? Number(event.dataTransfer.getData('text/plain'));
                  setDragId(null);
                  setOverId(null);
                  if (source && source !== post.id) onReorder(source, post.id);
                }}
              >
                <MediaThumb media={cover} className="ig-tile-media" />
                <span className="ig-tile-open" aria-hidden="true">
                  <IconEye size={13} />
                </span>
                {post.type === 'carousel' && post.media.length > 1 ? (
                  <span className="ig-tile-badge">
                    <IconLayers size={12} />
                  </span>
                ) : null}
                {post.type === 'reel' || post.type === 'story' ? (
                  <span className="ig-tile-badge">
                    <IconPlay size={11} />
                  </span>
                ) : null}
                {showStatus && post.status !== 'published' ? (
                  <span className={`ig-tile-status ${post.status}`}>{post.status === 'draft' ? 'Draft' : 'Scheduled'}</span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PostView({
  post,
  avatarUrl,
  onPrev,
  onNext,
}: {
  post: Post | null;
  avatarUrl: string | null;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [gridCrop, setGridCrop] = useState(false);

  useEffect(() => {
    setIndex(0);
    setExpanded(false);
    setLiked(false);
    setGridCrop(false);
  }, [post?.id]);

  if (!post) {
    return (
      <div className="ig-profile">
        <div className="ig-topbar">
          <span className="ig-lock">Post</span>
        </div>
        <div className="ig-grid-empty" style={{ paddingTop: 120 }}>
          <IconSparkles size={26} />
          <p>Select a post.</p>
          <span>The preview shows exactly how it will look in the feed.</span>
        </div>
      </div>
    );
  }

  const current = post.media[index];
  const ratio = gridCrop ? '1 / 1' : post.type === 'story' ? '9 / 16' : '4 / 5';
  const song = [post.songTitle, post.songArtist].filter(Boolean).join(' · ');

  return (
    <div className="ig-post">
      <div className="ig-topbar">
        <span className="ig-post-title">
          <button type="button" className="ig-nav" onClick={onPrev} aria-label="Previous post">
            <IconChevronLeft size={18} />
          </button>
          Post
        </span>
        <span className="ig-nav-group">
          <button
            type="button"
            className={`ig-crop-toggle ${gridCrop ? 'on' : ''}`}
            onClick={() => setGridCrop((value) => !value)}
            title="How it looks as a grid tile (1:1 crop)"
          >
            {gridCrop ? '1:1' : '4:5'}
          </button>
          <button type="button" className="ig-nav" onClick={onNext} aria-label="Next post">
            <IconChevronRight size={18} />
          </button>
        </span>
      </div>

      <div className="ig-post-head">
        <span className="ig-post-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : null}
        </span>
        <span className="ig-post-user">
          <strong>dechire.band</strong>
          {post.location ? <span>{post.location}</span> : null}
        </span>
        <IconDots size={17} />
      </div>

      <div className="ig-post-media" style={{ aspectRatio: ratio }}>
        <MediaThumb media={current} className="ig-post-media-inner" />
        {post.media.length > 1 ? (
          <>
            <span className="ig-carousel-count">
              {index + 1}/{post.media.length}
            </span>
            {index > 0 ? (
              <button type="button" className="ig-carousel-nav prev" onClick={() => setIndex(index - 1)}>
                <IconChevronLeft size={16} />
              </button>
            ) : null}
            {index < post.media.length - 1 ? (
              <button
                type="button"
                className="ig-carousel-nav next"
                onClick={() => setIndex(index + 1)}
              >
                <IconChevronRight size={16} />
              </button>
            ) : null}
            <span className="ig-carousel-dots">
              {post.media.map((_, dotIndex) => (
                <span key={dotIndex} className={dotIndex === index ? 'on' : ''} />
              ))}
            </span>
          </>
        ) : null}
        {post.type === 'story' ? <span className="ig-story-chip">Story preview · 9:16</span> : null}
      </div>

      <div className="ig-post-actions">
        <span className="ig-action-group">
          <button type="button" className={liked ? 'liked' : ''} onClick={() => setLiked(!liked)}>
            <IconHeart size={22} strokeWidth={liked ? 2.4 : 1.7} />
          </button>
          <IconComment size={22} strokeWidth={1.7} />
          <IconShare size={22} strokeWidth={1.7} />
        </span>
        <IconBookmark size={22} strokeWidth={1.7} />
      </div>

      <div className="ig-likes">{compactNumber(likesFor(post) + (liked ? 1 : 0))} Likes</div>

      <div className={`ig-caption ${expanded ? 'expanded' : ''}`}>
        <strong>dechire.band</strong>{' '}
        <span>{post.caption || '— no caption —'}</span>
        {!expanded && (post.caption?.length ?? 0) > 120 ? (
          <button type="button" className="ig-more" onClick={() => setExpanded(true)}>
            more
          </button>
        ) : null}
      </div>

      {post.firstComment ? (
        <div className="ig-comment">
          <strong>dechire.band</strong> {post.firstComment}
        </div>
      ) : null}

      <div className="ig-comments-link">View all {commentsFor(post)} comments</div>

      {song ? (
        <div className="ig-song">
          <IconMusic size={13} />
          <span className="ig-song-title">{song}</span>
        </div>
      ) : null}

      {post.location ? (
        <div className="ig-location">
          <IconMapPin size={12} />
          {post.location}
        </div>
      ) : null}

      <div className="ig-timestamp">
        {post.status === 'published'
          ? `Posted on ${formatDate(post.publishedAt ?? post.scheduledAt)}`
          : post.scheduledAt
          ? `Scheduled for ${formatDate(post.scheduledAt)}`
          : 'Not scheduled yet · Draft'}
      </div>
    </div>
  );
}

export default function InstagramMock({
  profile,
  posts,
  mode,
  activePost,
  showStatus = false,
  onSelectPost,
  onReorder,
  onPrev,
  onNext,
}: {
  profile: Profile;
  posts: Post[];
  mode: 'profile' | 'post';
  activePost?: Post | null;
  showStatus?: boolean;
  onSelectPost?: (id: number) => void;
  onReorder?: (draggedId: number, targetId: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="phone" id="instagram-mock">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">
          <StatusBar />
          <div className="ig-scroll">
            {mode === 'profile' ? (
              <ProfileView
                profile={profile}
                posts={posts}
                showStatus={showStatus}
                onSelectPost={onSelectPost}
                onReorder={onReorder}
                activeId={activePost?.id ?? null}
              />
            ) : (
              <PostView
                post={activePost ?? null}
                avatarUrl={profile.avatarUrl}
                onPrev={onPrev}
                onNext={onNext}
              />
            )}
          </div>
          {mode === 'profile' ? <TabBar avatarUrl={profile.avatarUrl} /> : null}
          <div className="phone-homebar" />
        </div>
      </div>
    </div>
  );
}
