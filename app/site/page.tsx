import type { CSSProperties } from 'react';
import Reveal from '@/components/site/Reveal';
import SiteAtmosphere from '@/components/site/SiteAtmosphere';
import SiteSpotlight from '@/components/site/SiteSpotlight';
import { getSiteData } from '@/lib/site';
import { manifestoParts, teaserEmbed } from '@/lib/siteEmbed';
import type { MediaItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Hero title: one span per letter, so they can rise out of the dark one by one. */
function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, index) => (
        <span key={`${char}-${index}`} style={{ animationDelay: `${0.15 + index * 0.06}s` }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}

/** Hand-drawn underline that sits under a word like it was added with a pen. */
function Scratch({ className = '' }: { className?: string }) {
  return (
    <svg className={`sf-scratch ${className}`} viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 9C48 4 92 11 140 7c46-4 92 2 158-3" />
      <path d="M12 12c52-4 96 1 142-2" />
    </svg>
  );
}

const TAPE_TILT = ['-1.6deg', '1.2deg', '-0.8deg', '1.8deg'];

export default function SitePage() {
  const { settings, shots, feed, accentHex, bandName, handle } = getSiteData();
  const style = { '--site-accent': settings.accentHex || accentHex } as CSSProperties;
  const instagram = settings.links.find((link) => link.kind === 'instagram' && link.url);
  const teaser = settings.showTeaser ? teaserEmbed(settings.teaserUrl) : null;
  const letter = settings.manifesto.filter((line) => line.trim().length > 0);
  const crew = settings.crew.filter((member) => member.name.trim().length > 0);
  const crewLine = crew.map((member) => member.name).join(' · ');
  const year = new Date().getFullYear();

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
            <span className="site-mono">not yet /// nothing to show</span>
            <h1 className="gate-title">
              {bandName}
              <span className="gate-echo" aria-hidden="true">
                {bandName}
              </span>
            </h1>
            <p className="gate-line">{settings.tagline || 'Something is being built here. Loudly, slowly.'}</p>
            {crewLine ? <p className="gate-crew site-mono">{crewLine}</p> : null}
            {instagram ? (
              <a className="sf-link" href={instagram.url} target="_blank" rel="noreferrer">
                instagram ↗
              </a>
            ) : null}
            <span className="gate-stamp">closed</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`site ${settings.grain ? '' : 'no-grain'}`} style={style}>
      <SiteAtmosphere />

      {/* ------------------------------------------------------------- hero */}
      {settings.showHero ? (
        <header className="sf-hero">
          <SiteSpotlight image={settings.heroUrl} video={settings.heroVideo} />
          <div className="sf-hero-veil" />

          <div className="sf-spine" aria-hidden="true">
            <span>side a</span>
            <i />
            <span>{settings.tagline || 'post-hardcore'}</span>
            <i />
            <span>33 ⅓</span>
          </div>

          <div className="sf-hero-top">
            <a
              className="site-mono sf-hero-handle"
              href={instagram?.url ?? '#'}
              target={instagram ? '_blank' : undefined}
              rel="noreferrer"
            >
              @{handle}
            </a>
            <span className="site-mono sf-hero-note">official site /// do not fold</span>
          </div>

          <div className="sf-hero-core">
            <span className="sf-kicker">
              <i />
              post-hardcore /// the long way down
            </span>

            <h1 className="sf-title">
              <span className="sf-title-main">
                <Letters text={bandName.toUpperCase()} />
              </span>
              <span className="sf-title-echo" aria-hidden="true">
                {bandName.toUpperCase()}
              </span>
            </h1>

            {settings.tagline ? (
              <p className="sf-tagline">
                {settings.tagline}
                <Scratch />
              </p>
            ) : null}
          </div>

          <div className="sf-hero-foot">
            <span className="sf-crewline">{crewLine}</span>
            <a className="sf-scroll" href="#note">
              <span>read the note</span>
              <i aria-hidden="true" />
            </a>
          </div>

          <div className="sf-torn" aria-hidden="true" />
        </header>
      ) : null}

      {/* -------------------------------------------------------------- note */}
      {settings.showIntro && (letter.length || crew.length) ? (
        <section className="sf-note" id="note">
          <div className="site-wrap sf-note-wrap">
            <Reveal className="sf-sheet">
              <span className="sf-sheet-edge" aria-hidden="true" />
              <span className="sf-sheet-margin" aria-hidden="true">
                private — keep this
              </span>

              <div className="sf-sheet-head">
                <span className="site-mono">a note from us</span>
                <span className="site-mono">no. 01 / {year}</span>
              </div>

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

              {settings.introSignature ? (
                <p className="sf-sign">
                  {settings.introSignature}
                  <Scratch className="sf-sign-scratch" />
                </p>
              ) : null}

              <span className="sf-stamp" aria-hidden="true">
                <span>post</span>
                <span>hardcore</span>
                <span>{year}</span>
              </span>
            </Reveal>

            {crew.length ? (
              <Reveal className="sf-credits" delay={80}>
                <span className="site-mono sf-credits-label">the people in the room</span>
                <ul>
                  {crew.map((member) => (
                    <li key={member.name}>
                      <strong>{member.name}</strong>
                      {member.role ? <span>{member.role}</span> : null}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- contact sheet */}
      {settings.showMedia && (shots.length || teaser) ? (
        <section className="sf-shots">
          <div className="site-wrap">
            <header className="sf-head">
              <b>{settings.mediaTitle || 'contact sheet'}</b>
              <span className="site-mono">
                roll 01 /// {String(shots.length).padStart(2, '0')} frames
              </span>
            </header>

            {teaser ? (
              <Reveal className="sf-teaser">
                <span className="site-mono">{teaser.kind === 'video' ? 'clip /// play' : 'watch /// outside'}</span>
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
            ) : null}

            {shots.length ? (
              <div className="sf-strip">
                {shots.map((item: MediaItem, index: number) => (
                  <Reveal
                    key={item.id}
                    className="sf-frame"
                    delay={index * 60}
                    style={{ '--tilt': `${((index % 4) - 1.5) * 0.9}deg` } as CSSProperties}
                  >
                    <span className="sf-frame-no">{String(index + 1).padStart(2, '0')}</span>
                    <div className="sf-frame-img">
                      {item.mime.startsWith('video') ? (
                        <video src={item.url} autoPlay muted loop playsInline />
                      ) : (
                        <img src={item.url} alt={item.alt || item.title} loading="lazy" />
                      )}
                    </div>
                    <figcaption>{item.title}</figcaption>
                  </Reveal>
                ))}
              </div>
            ) : null}

            {settings.mediaNote ? (
              <Reveal className="sf-marginal" delay={90}>
                <i aria-hidden="true">*</i>
                {settings.mediaNote}
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- feed */}
      {settings.showFeed && feed.length ? (
        <section className="sf-feed">
          <div className="site-wrap">
            <header className="sf-head">
              <b>{settings.feedTitle || 'pinned to the wall'}</b>
              <span className="site-mono">last things we put outside</span>
            </header>

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
          <div className="site-wrap">
            <Reveal className="sf-press">
              <span className="site-mono">say hi</span>
              <blockquote>
                {settings.pressQuote ||
                  'Booking, collabs, or just to tell us a song helped — the inbox is open and we answer, eventually.'}
              </blockquote>
              {settings.pressSource ? <cite>{settings.pressSource}</cite> : null}
            </Reveal>

            <Reveal className="sf-receipt" delay={70}>
              <span className="site-mono sf-receipt-head">where to find us</span>
              <ul>
                {settings.links.map((link, index) => (
                  <li key={`${link.label}-${index}`}>
                    <a
                      href={link.url}
                      target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                      rel="noreferrer"
                    >
                      <i>{String(index + 1).padStart(2, '0')}</i>
                      <strong>{link.label}</strong>
                      <em aria-hidden="true" />
                      <span>↗</span>
                    </a>
                  </li>
                ))}
              </ul>
              <span className="site-mono sf-receipt-foot">
                {settings.footerNote || `post-hardcore /// ${year}`}
              </span>
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
            <span className="site-mono">{settings.footerNote || `© ${year} ${bandName}`}</span>
            <span className="site-mono">{crewLine || `side b /// ${year}`}</span>
            {instagram ? (
              <a className="site-mono" href={instagram.url} target="_blank" rel="noreferrer">
                @{handle} ↗
              </a>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
