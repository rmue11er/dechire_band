'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconCalendar,
  IconClock,
  IconFilm,
  IconMapPin,
  IconMusic,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconVideo,
} from '@/components/icons';
import VideoProjectModal from '@/components/videos/VideoProjectModal';
import { EmptyState, PageHead, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { toast } from '@/lib/toast';
import { durationLabel, videoStatusLabel } from '@/lib/videos';
import type { BandDocument, MediaItem, Song, VideoProject } from '@/lib/types';

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<BandDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [songFilter, setSongFilter] = useState<'all' | number>('all');
  const [modal, setModal] = useState<{ video: VideoProject | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const [videoResponse, songResponse, mediaResponse, docsResponse] = await Promise.all([
        fetch('/api/videos'),
        fetch('/api/songs'),
        fetch('/api/media'),
        fetch('/api/documents'),
      ]);
      const [videoData, songData, mediaData, docsData] = await Promise.all([
        videoResponse.json(),
        songResponse.json(),
        mediaResponse.json(),
        docsResponse.json(),
      ]);
      setVideos(videoData.videos ?? []);
      setSongs(songData.songs ?? []);
      setMedia(mediaData.media ?? []);
      setDocuments(docsData.documents ?? []);
      const wanted = Number(new URLSearchParams(window.location.search).get('song') ?? '');
      if (wanted > 0) setSongFilter(wanted);
    } catch {
      toast('Could not load the video projects', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      videos.filter((video) => {
        if (typeof songFilter === 'number' && video.songId !== songFilter) return false;
        if (!query.trim()) return true;
        const haystack = [video.title, video.songTitle, video.location, video.director, video.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [videos, songFilter, query]
  );

  const remove = async (video: VideoProject) => {
    if (!window.confirm(`Delete “${video.title}” and its ${video.shotCount} shot(s)?`)) return;
    try {
      const response = await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete the video');
      setVideos((current) => current.filter((entry) => entry.id !== video.id));
      toast('Video project deleted');
    } catch (error: any) {
      toast(error.message ?? 'Could not delete the video', 'error');
    }
  };

  if (loading) return <Spinner label="Loading the video desk" />;

  return (
    <div className="videos-page">
      <PageHead
        eyebrow="Music videos"
        title={
          <>
            Video<span className="slash">/</span>Lab
          </>
        }
        sub="Song, seconds, shots. Plan what happens when, keep every take and location in one place – and print the storyboard when you leave for the shoot."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ video: null })}>
            <IconPlus size={15} /> New video
          </button>
        }
      />

      <div className="video-toolbar">
        <div className="video-search">
          <IconSearch size={15} />
          <input
            className="input"
            value={query}
            placeholder="Search video, song, location …"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="select video-song-filter"
          value={songFilter}
          onChange={(event) =>
            setSongFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
          }
          aria-label="Filter by song"
        >
          <option value="all">All songs</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconVideo size={24} />}
          title={videos.length ? 'No video matches' : 'No music video planned yet'}
          hint={
            videos.length
              ? 'Change the search or song filter.'
              : 'Start a project, link the song and treatment, then build the timeline shot by shot.'
          }
          action={
            !videos.length ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ video: null })}>
                <IconPlus size={14} /> Plan the first video
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="video-grid">
          {filtered.map((video) => (
            <article key={video.id} className="video-card">
              <Link href={`/videos/${video.id}`} className="video-card-link">
                <div className="video-cover">
                  {video.coverUrl ? (
                    <img src={video.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <IconVideo size={28} />
                  )}
                  <span className={`video-status ${video.status}`}>{videoStatusLabel(video.status)}</span>
                </div>
                <div className="video-card-body">
                  <h3>{video.title}</h3>
                  <div className="video-card-meta">
                    {video.songTitle ? (
                      <span>
                        <IconMusic size={11} /> {video.songTitle}
                      </span>
                    ) : null}
                    <span>
                      <IconFilm size={11} /> {video.shotCount} shots
                    </span>
                    {video.plannedDuration ? (
                      <span>
                        <IconClock size={11} /> {durationLabel(video.plannedDuration)}
                      </span>
                    ) : null}
                  </div>
                  {video.shootDate || video.location ? (
                    <div className="video-card-where mono">
                      {video.shootDate ? (
                        <span>
                          <IconCalendar size={10} /> {formatDate(video.shootDate)}
                        </span>
                      ) : null}
                      {video.location ? (
                        <span>
                          <IconMapPin size={10} /> {video.location}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Link>
              <div className="video-card-actions">
                <button
                  type="button"
                  className="btn btn-icon"
                  title="Edit project"
                  onClick={() => setModal({ video })}
                >
                  <IconPencil size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  title="Delete project"
                  onClick={() => remove(video)}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <VideoProjectModal
        open={!!modal}
        project={modal?.video ?? null}
        songs={songs}
        media={media}
        documents={documents}
        onClose={() => setModal(null)}
        onSaved={(video) => {
          setVideos((current) =>
            modal?.video
              ? current.map((entry) => (entry.id === video.id ? video : entry))
              : [video, ...current]
          );
          setModal(null);
          if (!modal?.video) window.location.href = `/videos/${video.id}`;
        }}
      />
    </div>
  );
}
