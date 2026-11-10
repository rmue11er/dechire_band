import type { CSSProperties } from 'react';
import Reveal from '@/components/site/Reveal';
import SiteAtmosphere from '@/components/site/SiteAtmosphere';
import SiteSound from '@/components/site/SiteSound';
import { getSiteData } from '@/lib/site';
import { manifestoParts, teaserEmbed } from '@/lib/siteEmbed';
import type { MediaItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Hero title: one span per letter, so they can rise out of the dark one by one. */
function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, index) => (
        <span key={`${char}-${index}`} style={{ animationDelay: `${0.2 + index * 0.07}s` }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}

const TAPE_TILT = ['-1.8deg', '1.4deg', '-0.9deg', '2deg'];

function hexTriple(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'a49c92';
  return [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
    .join(' ');
}

/** A photo taped to the page – the one visual language the whole site uses. */
function Taped({
  item,
  delay = 0,
  angle,
  caption = true,
}: {
  item: MediaItem;
  delay?: number;
  angle: string;
  caption?: boolean;
}) {
  return (
    <Reveal className="sf-print" delay={delay} style={{ '--tape': angle } as CSSProperties}>
      <span className="sf-tape" aria-hidden="true" />
      {item.mime.startsWith('video') ? (
        <video src={item.url} autoPlay muted loop playsInline />
      ) : (
        <img src={item.url} alt={item.alt || item.title} loading="lazy" />
      )}
      {caption ? <span className="sf-print-cap">{item.title}</span> : null}
    </Reveal>
  );
}

export default function SitePage() {
  const { settings, shots, feed, accentHex, bandName, handle, release } = getSiteData();
  const accent = settings.accentHex || accentHex;
  const style = {
    '--site-accent': accent,
    '--site-accent-rgb': hexTriple(accent),
  } as CSSProperties;

  const instagram = settings.links.find((link) => link.kind === 'instagram' && link.url);
  const teaser = settings.showTeaser ? teaserEmbed(settings.teaserUrl) : null;
  const letter = settings.manifesto.filter((line) => line.trim().length > 0);
  const year = new Date().getFullYear();
  const noteShots = shots.slice(0, 3);

  const releaseDays = release
    ? Math.round(
        (new Date(`${release.date}T12:00:00Z`).getTime() -
          new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`).getTime()) /
          86_400_000
      )
    : 0;
  const releaseDate = release
    ? new Date(`${release.date}T12:00:00Z`)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        .toLowerCase()
    : '';
  const interlude = shots[3] ?? (shots.length > 1 ? shots[1] : null);

  /* ------------------------------------------------------------ pre-launch */
  if (!settings.published) {
    return (
      <div className="site" style={style}>
        <SiteAtmosphere />
        <section className="gate">
          {settings.heroUrl ? (
            <div className="gate-photo">
              <img src={settings.heroUrl} alt="" />
            </div>
          ) : null}
          <div className="gate-veil" />
          <div className="gate-inner">
            <h1 className="gate-title">{bandName}</h1>
            <p className="gate-line">{settings.tagline || 'Something is being built here. Slowly.'}</p>
            <p className="gate-note">nothing to see yet.</p>
            {instagram ? (
              <a className="sf-link" href={instagram.url} target="_blank" rel="noreferrer">
                instagram ↗
              </a>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`site ${settings.grain ? '' : 'no-grain'}`} style={style}>
      <SiteAtmosphere />
      <SiteSound />

      {/* ------------------------------------------------------------- hero */}
      {settings.showHero ? (
        <header className="sf-hero">
          {settings.heroVideo ? (
            <video className="sf-hero-bg" src={settings.heroVideo} autoPlay muted loop playsInline aria-hidden="true" />
          ) : settings.heroUrl ? (
            <img className="sf-hero-bg" src={settings.heroUrl} alt="" aria-hidden="true" />
          ) : null}
          <div className="sf-hero-veil" />

          <div className="sf-hero-top">
            <a
              className="sf-handle"
              href={instagram?.url ?? '#'}
              target={instagram ? '_blank' : undefined}
              rel="noreferrer"
            >
              @{handle}
            </a>
          </div>

          <div className="sf-hero-core">
            <div className="sf-hero-lead">
              <h1 className="sf-title">
                <span className="sf-title-main">
                  <Letters text={bandName} />
                </span>
                <span className="sf-title-ghost" aria-hidden="true">
                  {bandName}
                </span>
              </h1>

              {settings.tagline ? <p className="sf-tagline">{settings.tagline}</p> : null}
            </div>

            {settings.heroVideo || settings.heroUrl ? (
              <Reveal className="sf-print sf-hero-print" style={{ '--tape': '-2.2deg' } as CSSProperties}>
                <span className="sf-tape" aria-hidden="true" />
                {settings.heroVideo ? (
                  <video src={settings.heroVideo} autoPlay muted loop playsInline />
                ) : (
                  <img src={settings.heroUrl ?? ''} alt="" />
                )}
              </Reveal>
            ) : null}
          </div>

          <div className="sf-hero-foot">
            <a className="sf-scroll" href="#note">
              read the note <span aria-hidden="true">↓</span>
            </a>
          </div>
        </header>
      ) : null}

      {/* ---------------------------------------------------------- release */}
      {release ? (
        <section className="sf-release">
          <div className="site-wrap sf-release-inner">
            <Reveal className="sf-release-cover" delay={40}>
              <span className="sf-tape" aria-hidden="true" />
              {release.coverUrl ? (
                <img src={release.coverUrl} alt={release.title} loading="lazy" />
              ) : (
                <span className="sf-release-blank">{release.title.slice(0, 1)}</span>
              )}
            </Reveal>

            <Reveal className="sf-release-text" delay={120}>
              <span className="sf-label">
                {releaseDays <= 0 ? 'out now' : `out ${releaseDate}`}
              </span>
              <h2 className="sf-release-title">{release.title}</h2>
              <p className="sf-release-line">
                {releaseDays <= 0
                  ? `Everywhere you listen. ${releaseDays < 0 ? `${Math.abs(releaseDays)} days out and still warm.` : ''}`
                  : `Save it now and it is there on ${releaseDate}.`}
              </p>
              {releaseDays > 0 && release.presaveUrl ? (
                <a className="sf-release-link" href={release.presaveUrl} target="_blank" rel="noreferrer">
                  pre-save <span aria-hidden="true">↗</span>
                </a>
              ) : instagram ? (
                <a className="sf-release-link" href={instagram.url} target="_blank" rel="noreferrer">
                  listen <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- note */}
      {settings.showIntro && letter.length ? (
        <section className="sf-note" id="note">
          <span className="sf-chapter" aria-hidden="true">
            01
          </span>
          <div className="site-wrap sf-note-wrap">
            <Reveal className="sf-note-text">
              <span className="sf-label">a note from us</span>

              {settings.introTitle ? <h2 className="sf-note-title">{settings.introTitle}</h2> : null}

              <div className="sf-letter">
                {letter.map((line, index) => (
                  <Reveal key={`${index}-${line.slice(0, 12)}`} className="sf-line" delay={index * 65} as="p">
                    {manifestoParts(line).map((part, partIndex) =>
                      part.accent ? <em key={partIndex}>{part.text}</em> : <span key={partIndex}>{part.text}</span>
                    )}
                  </Reveal>
                ))}
              </div>

              {settings.introSignature ? <p className="sf-sign">{settings.introSignature}</p> : null}
            </Reveal>

            {settings.showMedia && noteShots.length ? (
              <div className="sf-note-photos">
                {noteShots.map((item, index) => (
                  <Taped
                    key={item.id}
                    item={item}
                    delay={index * 90}
                    angle={TAPE_TILT[index % TAPE_TILT.length]}
                    caption={false}
                  />
                ))}
                {settings.mediaNote ? <span className="sf-note-caption">{settings.mediaNote}</span> : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- interlude */}
      {settings.showMedia && interlude ? (
        <section className="sf-interlude">
          <div className="sf-interlude-photo">
            <img src={interlude.url} alt="" loading="lazy" aria-hidden="true" />
          </div>
          <div className="sf-interlude-veil" aria-hidden="true" />
          {settings.tagline ? (
            <div className="site-wrap sf-interlude-line">
              <Reveal as="p">{settings.tagline}</Reveal>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ------------------------------------------------------------ teaser */}
      {settings.showMedia && teaser ? (
        <section className="sf-block">
          <div className="site-wrap">
            <Reveal className="sf-teaser">
              <span className="sf-label">{teaser.kind === 'video' ? 'a clip' : 'somewhere else'}</span>
              <div className="sf-teaser-frame">
                {teaser.kind === 'video' ? (
                  <video src={teaser.src} controls playsInline />
                ) : (
                  <iframe
                    src={teaser.src}
                    title={`${bandName} clip`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                )}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- feed */}
      {settings.showFeed && feed.length ? (
        <section className="sf-block sf-wall-section">
          <span className="sf-chapter" aria-hidden="true">
            02
          </span>
          <div className="site-wrap">
            <Reveal className="sf-label sf-label-wide">
              {settings.feedTitle || 'from the room'}
              <span className="sf-label-aside">the last things we put out</span>
            </Reveal>

            <div className="sf-wall">
              {feed.map((item, index) => (
                <Reveal
                  key={item.id}
                  className="sf-flyer"
                  delay={index * 55}
                  style={{ '--tape': TAPE_TILT[index % TAPE_TILT.length] } as CSSProperties}
                >
                  <a href={item.permalink ?? instagram?.url ?? '#'} target="_blank" rel="noreferrer">
                    <span className="sf-tape" aria-hidden="true" />
                    <img src={item.url} alt={item.caption} loading="lazy" />
                    <span className="sf-flyer-cap">{item.caption.slice(0, 64) || 'instagram'}</span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- connect */}
      {settings.showConnect ? (
        <section className="sf-connect">
          <span className="sf-chapter" aria-hidden="true">
            03
          </span>
          <div className="site-wrap">
            <Reveal className="sf-press">
              <span className="sf-label">say hi</span>
              <blockquote>
                {settings.pressQuote ||
                  'Booking, collabs, or just to say a song helped. The inbox is open. We answer, eventually.'}
              </blockquote>
              {settings.pressSource ? <cite>{settings.pressSource}</cite> : null}
            </Reveal>

            <Reveal className="sf-links" delay={70}>
              <span className="sf-links-head">where to find us</span>
              <ul>
                {settings.links.map((link, index) => (
                  <li key={`${link.label}-${index}`}>
                    <a
                      href={link.url}
                      target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                      rel="noreferrer"
                    >
                      <span>{link.label}</span>
                      <i aria-hidden="true">↗</i>
                    </a>
                  </li>
                ))}
              </ul>
              <span className="sf-links-foot">{settings.footerNote || `augsburg /// ${year}`}</span>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- footer */}
      {settings.showFooter ? (
        <footer className="sf-foot">
          <div className="sf-foot-name" aria-hidden="true">
            {bandName}
          </div>
          <div className="sf-foot-row">
            <span>{settings.footerNote || `© ${year} ${bandName}`}</span>
            {instagram ? (
              <a href={instagram.url} target="_blank" rel="noreferrer">
                @{handle} ↗
              </a>
            ) : (
              <span>@{handle}</span>
            )}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
