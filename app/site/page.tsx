import type { CSSProperties } from 'react';
import Reveal from '@/components/site/Reveal';
import SiteAtmosphere from '@/components/site/SiteAtmosphere';
import { getSiteData } from '@/lib/site';
import { manifestoParts, teaserEmbed } from '@/lib/siteEmbed';
import type { MediaItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Hero title: one span per letter, so they can rise one after another. */
function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, index) => (
        <span key={`${char}-${index}`} style={{ animationDelay: `${0.1 + index * 0.07}s` }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}

/** A single photo or clip from the library. */
function Shot({ item, index }: { item: MediaItem; index: number }) {
  const isVideo = item.mime.startsWith('video');
  return (
    <Reveal className={`shot ${index === 0 ? 'wide' : ''}`} delay={index * 70}>
      {isVideo ? (
        <video src={item.url} autoPlay muted loop playsInline />
      ) : (
        <img src={item.url} alt={item.alt || item.title} loading="lazy" />
      )}
      <span className="shot-cap">{item.title}</span>
    </Reveal>
  );
}

export default function SitePage() {
  const { settings, shots, feed, accentHex, bandName, handle } = getSiteData();
  const style = { '--site-accent': settings.accentHex || accentHex } as CSSProperties;
  const instagram = settings.links.find((link) => link.kind === 'instagram' && link.url);
  const teaser = settings.showTeaser ? teaserEmbed(settings.teaserUrl) : null;
  const letter = settings.manifesto.filter((line) => line.trim().length > 0);
  const crew = settings.crew.filter((member) => member.name.trim().length > 0);
  const crewLine = crew.map((member) => member.name).join(' · ');

  /* ------------------------------------------------------------ pre-launch */
  if (!settings.published) {
    return (
      <div className="site" style={style}>
        <SiteAtmosphere />
        <section className="gate" style={{ '--hero-overlay': settings.heroOverlay / 100 } as CSSProperties}>
          {settings.heroUrl ? (
            <div className="hero-media">
              <img src={settings.heroUrl} alt="" />
            </div>
          ) : null}
          <div className="hero-bled" />
          <div className="gate-inner">
            <span className="site-mono">not yet</span>
            <h1 className="gate-title">{bandName}</h1>
            <p className="gate-line">{settings.tagline || 'Something is being built here.'}</p>
            {crewLine ? <p className="gate-crew">{crewLine}</p> : null}
            {instagram ? (
              <a className="site-btn" href={instagram.url} target="_blank" rel="noreferrer">
                Instagram
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

      {/* ------------------------------------------------------------- hero */}
      {settings.showHero ? (
        <header className="hero" style={{ '--hero-overlay': settings.heroOverlay / 100 } as CSSProperties}>
          {settings.heroVideo ? (
            <div className="hero-media">
              <video src={settings.heroVideo} autoPlay muted loop playsInline />
            </div>
          ) : settings.heroUrl ? (
            <div className="hero-media">
              <img src={settings.heroUrl} alt="" />
            </div>
          ) : null}
          <div className="hero-bled" />
          <div className="hero-veil" />
          <div className="hero-echo" aria-hidden="true">
            {bandName}
          </div>

          <div className="hero-top">
            <span className="site-mono">Official site</span>
            {instagram ? (
              <a className="site-mono" href={instagram.url} target="_blank" rel="noreferrer">
                @{handle}
              </a>
            ) : (
              <span className="site-mono">@{handle}</span>
            )}
          </div>

          <div className="hero-core">
            <h1 className="hero-title">
              <Letters text={bandName.toUpperCase()} />
            </h1>
            {settings.tagline ? <p className="hero-tagline">{settings.tagline}</p> : null}
          </div>

          <div className="hero-foot">
            <span className="hero-crew">{crewLine}</span>
            <a className="hero-scroll" href="#note" aria-label="Scroll">
              <i />
              <span>Scroll</span>
            </a>
          </div>
        </header>
      ) : null}

      {/* -------------------------------------------------------- a note */}
      {settings.showIntro && (letter.length || crew.length) ? (
        <section className="section intro" id="note">
          <div className="site-wrap">
            <Reveal className="section-mark">
              <b>a note from us</b>
            </Reveal>

            {settings.introTitle ? (
              <Reveal className="intro-title" delay={40}>
                {settings.introTitle}
              </Reveal>
            ) : null}

            <div className="letter">
              {letter.map((line, index) => (
                <Reveal key={`${index}-${line.slice(0, 10)}`} className="letter-line" delay={index * 70}>
                  {manifestoParts(line).map((part, partIndex) =>
                    part.accent ? <em key={partIndex}>{part.text}</em> : <span key={partIndex}>{part.text}</span>
                  )}
                </Reveal>
              ))}
              {settings.introSignature ? (
                <Reveal className="letter-sign" delay={letter.length * 70}>
                  {settings.introSignature}
                </Reveal>
              ) : null}
            </div>

            {crew.length ? (
              <Reveal className="crew" delay={120}>
                {crew.map((member) => (
                  <div className="crew-member" key={member.name}>
                    <strong>{member.name}</strong>
                    {member.role ? <span>{member.role}</span> : null}
                  </div>
                ))}
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------- media corner */}
      {settings.showMedia && (shots.length || teaser) ? (
        <section className="section media-corner">
          <div className="site-wrap">
            <Reveal className="section-mark">
              <b>{settings.mediaTitle || 'photos'}</b>
            </Reveal>

            {teaser ? (
              <Reveal className="teaser" delay={40}>
                <span className="teaser-label">{teaser.kind === 'video' ? 'Clip' : 'Watch'}</span>
                <div className="teaser-frame">
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
              <div className="shots">
                {shots.map((item, index) => (
                  <Shot key={item.id} item={item} index={index} />
                ))}
              </div>
            ) : null}

            {settings.mediaNote ? (
              <Reveal className="media-note" delay={80}>
                {settings.mediaNote}
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- feed */}
      {settings.showFeed && feed.length ? (
        <section className="section">
          <div className="site-wrap">
            <Reveal className="section-mark">
              <b>{settings.feedTitle || 'from the feed'}</b>
            </Reveal>
            <div className="feed">
              {feed.map((item) => (
                <a
                  key={item.id}
                  className="feed-tile"
                  href={item.permalink ?? instagram?.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src={item.url} alt={item.caption} loading="lazy" />
                  <span>{item.caption.slice(0, 46) || 'Instagram'}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- connect */}
      {settings.showConnect ? (
        <section className="section">
          <div className="site-wrap">
            <Reveal className="section-mark">
              <b>say hi</b>
            </Reveal>
            <div className="connect-grid">
              <Reveal>
                <p className="press">
                  {settings.pressQuote ||
                    'Booking, collabs, or just to tell us a song helped — the inbox is open and we answer, eventually.'}
                </p>
                {settings.pressSource ? <p className="press-source">{settings.pressSource}</p> : null}
              </Reveal>
              <Reveal delay={90}>
                <div className="link-list">
                  {settings.links.map((link, index) => (
                    <a
                      key={`${link.label}-${index}`}
                      className="link-row"
                      href={link.url}
                      target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                      rel="noreferrer"
                    >
                      <i>{String(index + 1).padStart(2, '0')}</i>
                      <strong>{link.label}</strong>
                      <span>→</span>
                    </a>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ footer */}
      {settings.showFooter ? (
        <footer className="site-foot">
          <div className="foot-mark" aria-hidden="true">
            {bandName}
          </div>
          <div className="foot-row">
            <span className="site-mono">{settings.footerNote || `© ${new Date().getFullYear()} ${bandName}`}</span>
            <span className="site-mono">{crewLine || new Date().getFullYear()}</span>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
