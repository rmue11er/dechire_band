'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconCheck,
  IconClock,
  IconCopy,
  IconHash,
  IconImage,
  IconLayers,
  IconMapPin,
  IconMusic,
  IconNote,
  IconTrash,
  IconX,
  IconZap,
} from '@/components/icons';
import CaptionTools from '@/components/CaptionTools';
import { MediaThumb } from '@/components/MediaThumb';
import MediaPicker from '@/components/MediaPicker';
import PostPerformance from '@/components/PostPerformance';
import SnippetMenu from '@/components/SnippetMenu';
import { Field, Segmented } from '@/components/ui';
import { fromDateInput, relativeDay, toDateInput } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { MediaItem, Post, PostStatus, PostType } from '@/lib/types';

type Tab = 'content' | 'publish' | 'insights';

const HASHTAGS = '#dechire #posthardcore #ruhr #livemusic #newrelease #band';

const FOLD = 125;

const countHashtags = (value: string) => (value.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

export default function PostEditor({
  post,
  creating,
  media,
  onSaved,
  onDeleted,
  onUploaded,
  onCancelCreate,
}: {
  post: Post | null;
  creating: boolean;
  media: MediaItem[];
  onSaved: (post: Post) => void;
  onDeleted: (id: number) => void;
  onUploaded: (items: MediaItem[]) => void;
  onCancelCreate: () => void;
}) {
  const [type, setType] = useState<PostType>('photo');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [caption, setCaption] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [altText, setAltText] = useState('');
  const [location, setLocation] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaIds, setMediaIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('content');

  const captionRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setType(post?.type ?? 'photo');
    setStatus(post?.status ?? 'draft');
    setCaption(post?.caption ?? '');
    setFirstComment(post?.firstComment ?? '');
    setAltText(post?.altText ?? '');
    setLocation(post?.location ?? '');
    setSongTitle(post?.songTitle ?? '');
    setSongArtist(post?.songArtist ?? '');
    setScheduledAt(toDateInput(post?.scheduledAt));
    setMediaIds(post?.media.map((item) => item.id) ?? []);
    setTab('content');
  }, [post?.id, creating]);

  const selectedMedia = mediaIds
    .map((id) => media.find((item) => item.id === id))
    .filter(Boolean) as MediaItem[];

  const save = useCallback(
    async (overrides?: { status?: PostStatus; scheduledAt?: string }) => {
      const nextStatus = overrides?.status ?? status;
      const nextScheduledAt = overrides?.scheduledAt ?? scheduledAt;

      if (!mediaIds.length && nextStatus !== 'draft') {
        toast('A scheduled or published post needs at least one media item', 'error');
        setTab('content');
        return;
      }
      if (caption.length > 2200) {
        toast('Caption is longer than 2,200 characters', 'error');
        return;
      }

      setSaving(true);
      const payload: Record<string, any> = {
        type,
        status: nextStatus,
        caption,
        firstComment,
        altText,
        location,
        songTitle,
        songArtist,
        scheduledAt: fromDateInput(nextScheduledAt),
        mediaIds,
      };
      if (nextStatus === 'published' && !post?.publishedAt) payload.publishedAt = new Date().toISOString();
      if (nextStatus !== 'published') payload.publishedAt = null;

      try {
        const response = await fetch(creating ? '/api/posts' : `/api/posts/${post?.id}`, {
          method: creating ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Failed to save');
        if (nextStatus !== status) setStatus(nextStatus);
        onSaved(data.post);
        toast(
          nextStatus === 'draft'
            ? creating
              ? 'Draft created – not scheduled'
              : 'Saved as draft – not scheduled'
            : creating
              ? 'Post created'
              : 'Post saved'
        );
      } catch (error: any) {
        toast(error.message ?? 'Failed to save', 'error');
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      altText,
      caption,
      creating,
      firstComment,
      location,
      mediaIds,
      post?.id,
      post?.publishedAt,
      songArtist,
      songTitle,
      status,
      type,
      scheduledAt,
    ]
  );

  /** Always writes `status: 'draft'` – the date (if any) is only a note. */
  const saveDraft = useCallback(() => save({ status: 'draft' }), [save]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 's' || event.key === 'Enter')) {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const duplicate = async () => {
    if (!post) return;
    try {
      const response = await fetch(`/api/posts/${post.id}/duplicate`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not duplicate the post');
      onSaved(data.post);
      toast('Post duplicated as a draft');
    } catch (error: any) {
      toast(error.message ?? 'Could not duplicate the post', 'error');
    }
  };

  const remove = async () => {
    if (!post) return;
    if (!window.confirm('Delete this post? It moves to the bin in Settings.')) return;
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      onDeleted(post.id);
      toast('Post deleted');
    } catch (error: any) {
      toast(error.message ?? 'Failed to delete', 'error');
    }
  };

  const presetDate = (days: number, hour = 18) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return toDateInput(date.toISOString());
  };

  const hashtags = countHashtags(`${caption} ${firstComment}`);
  const captionLength = caption.length;
  const fillRatio = Math.min(100, (captionLength / 2200) * 100);

  const checks: { key: Tab; label: string; ok: boolean; required: boolean; hint: string }[] = [
    {
      key: 'content',
      label: 'Media',
      ok: mediaIds.length > 0,
      required: true,
      hint: 'At least one image or video',
    },
    {
      key: 'content',
      label: 'Caption',
      ok: caption.trim().length > 0,
      required: true,
      hint: 'Say it in your own words',
    },
    {
      key: 'content',
      label: 'Hook',
      ok: caption.trim().length >= 40,
      required: false,
      hint: 'The first 125 characters decide whether people tap “more”',
    },
    {
      key: 'content',
      label: 'Alt text',
      ok: altText.trim().length > 0,
      required: false,
      hint: 'Accessibility and search – worth 30 seconds',
    },
    {
      key: 'content',
      label: 'Hashtags',
      ok: hashtags > 0,
      required: false,
      hint: 'First comment beats caption for hashtags',
    },
    {
      key: 'publish',
      label: 'Date',
      ok: Boolean(scheduledAt) || status === 'draft',
      required: true,
      hint: status === 'draft' ? 'Not needed while it is a draft' : 'Scheduled posts need a date',
    },
  ];

  const blockers = checks.filter((check) => check.required && !check.ok);
  const optionalOpen = checks.filter((check) => !check.required && !check.ok);

  return (
    <div className="panel editor-panel">
      <div className="editor-head">
        <div className="editor-head-main">
          <span className="mono small muted">{creating ? 'New post' : `Post #${post?.id}`}</span>
          <strong className="editor-headline">
            {caption.split('\n')[0].slice(0, 64) || (creating ? 'Draft a new post' : 'Untitled post')}
          </strong>
        </div>
        <div className={`editor-ready ${status === 'published' ? 'ready' : blockers.length ? 'blocked' : 'ready'}`}>
          {status === 'published' ? (
            <span>
              <IconCheck size={13} /> Published
            </span>
          ) : blockers.length ? (
            <span>
              {blockers.length} to go · {blockers.map((blocker) => blocker.label).join(', ')}
            </span>
          ) : (
            <span>
              <IconCheck size={13} /> Ready to schedule
            </span>
          )}
        </div>
      </div>

      <div className="editor-checks">
        {checks.map((check) => (
          <button
            key={check.label}
            type="button"
            className={`check-chip ${check.ok ? 'ok' : check.required ? 'missing' : 'open'}`}
            title={check.hint}
            onClick={() => setTab(check.key)}
          >
            <span className="dot" />
            {check.label}
          </button>
        ))}
        {optionalOpen.length && !blockers.length ? (
          <span className="mono small muted">polish: {optionalOpen.map((item) => item.label).join(', ')}</span>
        ) : null}
      </div>

      <div className="editor-tabs">
        {(
          [
            { value: 'content', label: 'Content' },
            { value: 'publish', label: 'Publish' },
            { value: 'insights', label: 'Insights' },
          ] as { value: Tab; label: string }[]
        ).map((entry) => (
          <button
            key={entry.value}
            type="button"
            className={`editor-tab ${tab === entry.value ? 'on' : ''}`}
            onClick={() => setTab(entry.value)}
          >
            {entry.label}
          </button>
        ))}
        <span className="mono small muted editor-tab-hint">⌘S</span>
      </div>

      <div className="editor-scroll">
        {tab === 'content' ? (
          <div className="editor-stack">
            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Media</span>
                <span className="mono small muted">
                  {mediaIds.length} {mediaIds.length === 1 ? 'file' : 'files'}
                  {mediaIds.length > 1 ? ' · carousel order = 1, 2, 3' : ''}
                </span>
              </div>
              <div className="media-strip">
                {selectedMedia.map((item, index) => (
                  <div key={item.id} className="media-strip-item">
                    <MediaThumb media={item} className="media-strip-thumb" />
                    <span className="media-strip-index">{index + 1}</span>
                    <button
                      type="button"
                      className="media-strip-remove"
                      onClick={() => setMediaIds(mediaIds.filter((id) => id !== item.id))}
                      aria-label="Remove"
                    >
                      <IconX size={11} />
                    </button>
                  </div>
                ))}
                <button type="button" className="media-add" onClick={() => setPickerOpen(true)}>
                  <IconImage size={18} />
                  <span>Media</span>
                </button>
              </div>
              {selectedMedia.length && selectedMedia[0].width && selectedMedia[0].height ? (
                <p className="editor-note">
                  {selectedMedia[0].width}×{selectedMedia[0].height} px
                  {type !== 'story' && selectedMedia[0].width !== selectedMedia[0].height
                    ? ' · the grid shows a 1:1 crop, the post itself 4:5'
                    : ''}
                </p>
              ) : null}
            </div>

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Caption</span>
                <span className={`count ${captionLength > 2200 ? 'over' : ''}`}>{captionLength} / 2200</span>
              </div>

              <textarea
                ref={captionRef}
                className="textarea caption-input"
                rows={8}
                placeholder={'What is it about? Tell it like you would from the stage …'}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />

              <div className="caption-meter">
                <span className="caption-meter-track">
                  <span className="caption-meter-fill" style={{ width: `${fillRatio}%` }} />
                  <i style={{ left: `${(FOLD / 2200) * 100}%` }} title="Instagram folds here" />
                </span>
                <span className="mono small muted">
                  {captionLength <= FOLD
                    ? `${FOLD - captionLength} chars before “more”`
                    : 'everything after 125 chars is behind “more”'}
                </span>
              </div>

              <div className="row wrap" style={{ gap: 8 }}>
                <CaptionTools targetRef={captionRef} value={caption} onChange={setCaption} />
                <SnippetMenu
                  kinds={['caption', 'hook']}
                  currentText={caption}
                  onInsert={(text) => setCaption((current) => (current ? `${current}\n\n${text}` : text))}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(caption);
                      toast('Caption copied – ready for Instagram');
                    } catch {
                      toast('Could not copy', 'error');
                    }
                  }}
                >
                  <IconCopy size={13} /> Copy
                </button>
              </div>

              <p className="editor-note">
                <IconZap size={12} /> Line breaks and Unicode fonts survive the upload – emoji do too, but keep
                the first line readable.
              </p>
            </div>

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">First comment</span>
                <span className={`mono small muted ${hashtags > 30 ? 'over' : ''}`}>
                  {hashtags} hashtags{hashtags > 30 ? ' · Instagram allows 30' : ''}
                </span>
              </div>
              <textarea
                ref={commentRef}
                className="textarea"
                rows={3}
                placeholder="Ticket link, hashtags, credits …"
                value={firstComment}
                onChange={(event) => setFirstComment(event.target.value)}
              />
              <div className="row wrap" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setFirstComment(firstComment ? `${firstComment} ${HASHTAGS}` : HASHTAGS)}
                >
                  <IconHash size={13} /> Hashtags
                </button>
                <SnippetMenu
                  kinds={['hashtags']}
                  currentText={firstComment}
                  onInsert={(text) => setFirstComment((current) => (current ? `${current} ${text}` : text))}
                />
                <CaptionTools targetRef={commentRef} value={firstComment} onChange={setFirstComment} compact />
                <span className="mono small muted">hashtags belong here, not in the caption</span>
              </div>
            </div>

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Alt text</span>
                {selectedMedia[0]?.alt ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setAltText(selectedMedia[0].alt)}
                  >
                    Use asset alt text
                  </button>
                ) : null}
              </div>
              <input
                className="input"
                placeholder="What can you see in the image?"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
              />
              <p className="editor-note">Screen readers and search read this – describe what is really visible.</p>
            </div>
          </div>
        ) : null}

        {tab === 'publish' ? (
          <div className="editor-stack">
            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Format</span>
              </div>
              <Segmented
                value={type}
                onChange={(value) => setType(value)}
                options={[
                  { value: 'photo', label: 'Photo' },
                  { value: 'carousel', label: 'Carousel' },
                  { value: 'reel', label: 'Reel' },
                  { value: 'story', label: 'Story' },
                ]}
              />
              <p className="editor-note">
                {type === 'carousel'
                  ? 'Every selected image becomes a slide, in the order above.'
                  : type === 'story'
                  ? 'Stories are 9:16 – keep text away from the top and bottom 8 %.'
                  : type === 'reel'
                  ? 'Reels need a video file and a cover image.'
                  : 'One image, 4:5 is the safe choice for the feed.'}
              </p>
            </div>

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Status</span>
              </div>
              <Segmented<PostStatus>
                value={status}
                onChange={(value) => {
                  if (value === 'scheduled' && !scheduledAt) setScheduledAt(presetDate(1));
                  setStatus(value);
                }}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'published', label: 'Published' },
                ]}
              />
              <p className="small muted" style={{ marginTop: 8 }}>
                {status === 'draft'
                  ? 'A draft just sits here. Nothing is planned, nothing goes out – and it needs no date.'
                  : status === 'scheduled'
                    ? 'Goes out on its own when the date has come (scheduler or an open tab).'
                    : 'Marked as already online – only for your own archive.'}
              </p>
            </div>

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Scheduled for</span>
                <span className="count">
                  {scheduledAt
                    ? status === 'draft'
                      ? `note · ${relativeDay(fromDateInput(scheduledAt))}`
                      : relativeDay(fromDateInput(scheduledAt))
                    : 'open'}
                </span>
              </div>
              <div className="input-icon">
                <IconClock size={14} />
                <input
                  type="datetime-local"
                  className="input"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setScheduledAt(presetDate(1))}>
                  Tomorrow 18:00
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setScheduledAt(presetDate(2))}>
                  In 2 days
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setScheduledAt(presetDate(3, 12))}>
                  In 3 days · noon
                </button>
                {scheduledAt ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setScheduledAt('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {status === 'draft' && scheduledAt ? (
                <p className="small muted" style={{ marginTop: 8 }}>
                  Draft – this date is only a note.{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setStatus('scheduled')}
                  >
                    Schedule it for then
                  </button>
                </p>
              ) : null}
            </div>

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Place & sound</span>
              </div>
              <div className="form-row">
                <Field label="Location">
                  <div className="input-icon">
                    <IconMapPin size={14} />
                    <input
                      className="input"
                      placeholder="Halle (Saale)"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Song">
                  <div className="input-icon">
                    <IconMusic size={14} />
                    <input
                      className="input"
                      placeholder="Fracture"
                      value={songTitle}
                      onChange={(event) => setSongTitle(event.target.value)}
                    />
                  </div>
                </Field>
              </div>
              <Field label="Artist">
                <input
                  className="input"
                  placeholder="DECHIRE"
                  value={songArtist}
                  onChange={(event) => setSongArtist(event.target.value)}
                />
              </Field>
            </div>

            <div className="editor-hint">
              <IconLayers size={14} />
              <span>
                Control the feed order with the list on the right – the first entry is top left in your profile.
              </span>
            </div>
          </div>
        ) : null}

        {tab === 'insights' ? (
          <div className="editor-stack">
            {!creating && post ? (
              <PostPerformance post={post} onUpdated={onSaved} />
            ) : (
              <div className="editor-block">
                <p className="small muted" style={{ margin: 0 }}>
                  Save the post first – then you can publish it to Instagram and pull the numbers in here.
                </p>
              </div>
            )}

            <div className="editor-block">
              <div className="editor-block-head">
                <span className="label">Checklist</span>
              </div>
              <ul className="editor-checklist">
                {checks.map((check) => (
                  <li key={check.label} className={check.ok ? 'ok' : ''}>
                    <IconCheck size={12} />
                    <span>
                      <strong>{check.label}</strong> – {check.hint}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel-foot editor-foot">
        {!creating ? (
          <>
            <button type="button" className="btn btn-danger" onClick={remove} title="Delete post">
              <IconTrash size={15} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={duplicate} title="Duplicate as a new draft">
              <IconCopy size={15} />
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onCancelCreate}>
            Cancel
          </button>
        )}
        {status !== 'draft' ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={saveDraft}
            disabled={saving}
            title="Keep it as a draft – nothing is scheduled"
          >
            <IconNote size={15} />
            Save as draft
          </button>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={() => save()} disabled={saving}>
          {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={15} />}
          {status === 'draft'
            ? creating
              ? 'Create draft'
              : 'Save draft'
            : status === 'scheduled'
              ? creating
                ? 'Create & schedule'
                : 'Save & schedule'
              : 'Save'}
        </button>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        media={media}
        selectedIds={mediaIds}
        onUploaded={(items) => {
          onUploaded(items);
          setMediaIds((current) => [...current, ...items.map((item) => item.id)]);
        }}
        onConfirm={(ids) => setMediaIds(ids)}
      />
    </div>
  );
}
