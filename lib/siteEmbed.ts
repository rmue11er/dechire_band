export type Embed =
  | { kind: 'video'; src: string }
  | { kind: 'iframe'; src: string }
  | null;

/**
 * Turns a pasted teaser link into something we can render: direct video files,
 * YouTube, Vimeo and Instagram posts/reels. Anything else is simply ignored.
 */
export function teaserEmbed(url?: string | null): Embed {
  const value = String(url ?? '').trim();
  if (!value) return null;

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(value)) {
    return { kind: 'video', src: value };
  }

  const youtube =
    value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i) ?? null;
  if (youtube) {
    return {
      kind: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0&modestbranding=1&playsinline=1`,
    };
  }

  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) {
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  const instagram = value.match(/instagram\.com\/(p|reel|tv)\/([\w-]+)/i);
  if (instagram) {
    return { kind: 'iframe', src: `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed` };
  }

  return null;
}

/** `*italic*` in the letter becomes a serif accent. */
export function manifestoParts(line: string) {
  return line
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2
        ? { text: chunk.slice(1, -1), accent: true }
        : { text: chunk, accent: false }
    );
}
