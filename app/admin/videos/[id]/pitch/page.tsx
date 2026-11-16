'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconDownload, IconPencil, IconSparkles } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { toast } from '@/lib/toast';
import { buildPitchDeck, pitchHtml, type PitchSlide } from '@/lib/pitch';
import type { Profile, VideoProject, VideoShot } from '@/lib/types';

/** data URLs are already self-contained – everything else has to be fetched once. */
async function toDataUrl(url: string) {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
    reader.readAsDataURL(blob);
  });
}

export default function PitchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const videoId = Number(params?.id);

  const [project, setProject] = useState<VideoProject | null>(null);
  const [shots, setShots] = useState<VideoShot[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [videoResponse, profileResponse] = await Promise.all([
          fetch(`/api/videos/${videoId}`),
          fetch('/api/profile'),
        ]);
        if (!videoResponse.ok) throw new Error('not-found');
        const videoData = await videoResponse.json();
        const profileData = await profileResponse.json();
        setProject(videoData.video);
        setShots(videoData.shots ?? []);
        setProfile(profileData.profile);
      } catch {
        toast('Konnte das Video nicht laden', 'error');
        router.push('/admin/videos');
      } finally {
        setLoading(false);
      }
    })();
  }, [videoId, router]);

  const deck = useMemo<PitchSlide[]>(
    () => (project && profile ? buildPitchDeck(project, shots, profile) : []),
    [project, shots, profile]
  );

  const go = useCallback(
    (next: number) => setIndex((current) => Math.max(0, Math.min(deck.length - 1, next ?? current))),
    [deck.length]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
        event.preventDefault();
        setIndex((current) => Math.min(deck.length - 1, current + 1));
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        setIndex((current) => Math.max(0, current - 1));
      } else if (event.key === 'Home') {
        setIndex(0);
      } else if (event.key === 'End') {
        setIndex(deck.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deck.length]);

  const download = async () => {
    if (!project || !profile) return;
    setExporting(true);
    try {
      /* inline every image so the file works without the HQ */
      const inlined: PitchSlide[] = [];
      for (const slide of deck) {
        inlined.push({
          ...slide,
          images: slide.images?.length
            ? await Promise.all(
                slide.images.map(async (image) => ({ ...image, url: await toDataUrl(image.url) }))
              )
            : [],
          shots: slide.shots?.length
            ? await Promise.all(
                slide.shots.map(async (shot) => ({
                  ...shot,
                  image: shot.image ? await toDataUrl(shot.image) : null,
                }))
              )
            : slide.shots,
        });
      }
      const html = pitchHtml(inlined, {
        title: project.title,
        band: profile.bandName,
        exportedAt: new Date().toISOString().slice(0, 10),
      });
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pitch-${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video'}.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Pitch als HTML exportiert – lässt sich direkt verschicken');
    } catch (error: any) {
      toast(error.message ?? 'Export fehlgeschlagen', 'error');
    } finally {
      setExporting(false);
    }
  };

  const fullscreen = () => {
    const node = stage.current;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen?.();
  };

  if (loading) return <Spinner label="Pitch wird gebaut" />;
  if (!project || !deck.length) return null;

  return (
    <div className="pitch">
      <header className="pitch-bar">
        <div className="pitch-bar-left">
          <Link className="btn btn-ghost btn-sm" href={`/admin/videos/${project.id}`}>
            <IconChevronLeft size={14} /> Projekt
          </Link>
          <span className="mono small muted">
            Pitch · {index + 1}/{deck.length}
          </span>
        </div>
        <div className="pitch-bar-right">
          <button type="button" className="btn btn-sm btn-ghost" onClick={fullscreen}>
            <IconSparkles size={13} /> Vollbild
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
            Drucken / PDF
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={download} disabled={exporting}>
            <IconDownload size={13} /> {exporting ? 'Packt …' : 'Als HTML'}
          </button>
          <Link className="btn btn-sm btn-ghost" href={`/admin/videos/${project.id}`}>
            <IconPencil size={13} /> Bearbeiten
          </Link>
        </div>
      </header>

      <div className="pitch-stage" ref={stage}>
        {deck.map((slide, slideIndex) => (
          <section
            key={slide.id}
            className={`pitch-slide ${slideIndex === index ? 'is-active' : ''} kind-${slide.kind}`}
            aria-hidden={slideIndex !== index}
          >
            {slide.kind === 'cover' && slide.images?.[0] ? (
              <div className="pitch-cover-image">
                <img src={slide.images[0].url} alt="" />
              </div>
            ) : null}
            <div className="pitch-inner">
              <span className="pitch-eyebrow">{slide.eyebrow}</span>
              {slide.kind === 'cover' ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
              {slide.words?.length ? (
                <div className="pitch-words">
                  {slide.words.map((word) => (
                    <span key={word}>{word}</span>
                  ))}
                </div>
              ) : null}
              {slide.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {slide.kind === 'look' && slide.images?.length ? (
                <div className="pitch-frames">
                  {slide.images.map((image, imageIndex) => (
                    <div key={`${image.url.slice(0, 40)}-${imageIndex}`} className="pitch-frame">
                      <img src={image.url} alt="" />
                    </div>
                  ))}
                </div>
              ) : null}
              {slide.shots?.length ? (
                <div className="pitch-board">
                  {slide.shots.map((shot) => (
                    <article key={shot.index} className="pitch-shot">
                      <div className={`pitch-shot-image ${shot.image ? '' : 'is-empty'}`}>
                        {shot.image ? <img src={shot.image} alt="" /> : 'ohne Bild'}
                      </div>
                      <div className="pitch-shot-body">
                        <span className="pitch-shot-no">
                          {String(shot.index).padStart(2, '0')} · {shot.section}
                        </span>
                        <p>{shot.description}</p>
                        <span className="pitch-shot-meta">
                          {shot.time} → {shot.length}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              {slide.facts?.length ? (
                <div className="pitch-facts">
                  {slide.facts.map((fact) => (
                    <div key={fact.label} className="pitch-fact">
                      <span>{fact.label}</span>
                      <strong>{fact.value}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="pitch-footer">
                {profile?.bandName} · {project.title}
              </div>
            </div>
          </section>
        ))}
      </div>

      <footer className="pitch-nav">
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Vorherige Folie"
        >
          <IconChevronLeft size={14} />
        </button>
        <div className="pitch-dots">
          {deck.map((slide, dotIndex) => (
            <button
              key={slide.id}
              type="button"
              className={`pitch-dot ${dotIndex === index ? 'on' : ''}`}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Folie ${dotIndex + 1}: ${slide.title}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => go(index + 1)}
          disabled={index === deck.length - 1}
          aria-label="Nächste Folie"
        >
          <IconChevronRight size={14} />
        </button>
        <span className="mono small muted">← → zum Blättern · Vollbild fürs Gespräch</span>
      </footer>
    </div>
  );
}
