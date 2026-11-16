'use client';

import {
  IconBookmark,
  IconComment,
  IconHeart,
  IconMusic,
  IconPlay,
  IconSearch,
  IconShare,
  IconSparkles,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import type { Post, Profile } from '@/lib/types';

const handleOf = (profile: Profile) => `@${(profile.handle || profile.bandName).replace(/^@/, '')}`;
const likesFor = (post: Post) => 320 + ((post.id * 521) % 9400);
const commentsFor = (post: Post) => 6 + ((post.id * 17) % 120);

/**
 * A 9:16 preview of how a post lands in the TikTok “For You” feed.
 * Deliberately simplified – enough to judge crop, caption and mood.
 */
export default function TikTokMock({
  profile,
  post,
  privacyLevel = 'SELF_ONLY',
}: {
  profile: Profile;
  post: Post | null;
  privacyLevel?: 'SELF_ONLY' | 'PUBLIC_TO_EVERYONE';
}) {
  const media = post?.media.find((item) => item.mime.startsWith('video/')) ?? post?.media[0] ?? null;
  const caption = post?.caption?.trim() || 'Your caption shows up here – first line matters most.';
  const likes = post ? likesFor(post) : 1240;
  const comments = post ? commentsFor(post) : 38;

  return (
    <div className="tt-mock" aria-label="TikTok preview">
      <div className="tt-screen">
        <div className="tt-video">
          <MediaThumb media={media} className="tt-video-media" alt={caption.slice(0, 80)} />
          <div className="tt-scrim" />

          <div className="tt-topbar">
            <span className="tt-topbar-icon">
              <IconSearch size={19} />
            </span>
            <div className="tt-tabs">
              <span>Folge ich</span>
              <span className="on">Für dich</span>
            </div>
          </div>

          <div className="tt-center-play">
            <span>
              <IconPlay size={22} />
            </span>
          </div>

          <div className="tt-rail">
            <div className="tt-rail-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span />}
              <i>+</i>
            </div>
            <div className="tt-action">
              <IconHeart size={27} />
              <span>{likes.toLocaleString('de-DE')}</span>
            </div>
            <div className="tt-action">
              <IconComment size={26} />
              <span>{comments}</span>
            </div>
            <div className="tt-action">
              <IconBookmark size={24} />
              <span>{Math.max(2, Math.round(comments / 4))}</span>
            </div>
            <div className="tt-action">
              <IconShare size={25} />
              <span>{Math.max(1, Math.round(comments / 6))}</span>
            </div>
            <div className="tt-disc">
              <span />
            </div>
          </div>

          <div className="tt-meta">
            <div className="tt-author">{handleOf(profile)}</div>
            <p className="tt-caption">{caption}</p>
            <div className="tt-sound">
              <IconMusic size={13} />
              <span className="tt-sound-track">
                <span>Original sound · {profile.bandName}</span>
              </span>
            </div>
          </div>

          <div className="tt-progress">
            <span style={{ width: '18%' }} />
          </div>
        </div>

        <div className="tt-chrome">
          <span>Startseite</span>
          <span>Entdecken</span>
          <span className="tt-plus">+</span>
          <span>Posteingang</span>
          <span>Profil</span>
        </div>

        {post ? (
          <div className="tt-badge">
            {post.platform === 'both' ? 'IG + TT' : 'TikTok'}
            <i>·</i>
            {post.status === 'published' ? 'Published' : post.status === 'scheduled' ? 'Scheduled' : 'Draft'}
            <i>·</i>
            {privacyLevel === 'SELF_ONLY' ? 'Only me' : 'Public'}
          </div>
        ) : (
          <div className="tt-badge">
            <IconSparkles size={11} /> Vorschau
          </div>
        )}
      </div>
    </div>
  );
}