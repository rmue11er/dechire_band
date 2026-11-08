/**
 * Unicode “fonts” for Instagram captions.
 *
 * Instagram strips real fonts, but it keeps plain Unicode text – so the trick is
 * mapping latin characters onto other Unicode blocks (mathematical alphanumerics,
 * fullwidth forms, small caps …). These helpers do exactly that, in both directions.
 */

const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const az = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

type Offset = {
  upper: number;
  lower: number;
  digit?: number;
  exceptions?: Record<string, string>;
};

function buildMap({ upper, lower, digit, exceptions }: Offset): Record<string, string> {
  const map: Record<string, string> = {};
  for (let index = 0; index < 26; index += 1) {
    map[AZ[index]] = String.fromCodePoint(upper + index);
    map[az[index]] = String.fromCodePoint(lower + index);
  }
  if (digit) {
    for (let index = 0; index < 10; index += 1) {
      map[DIGITS[index]] = String.fromCodePoint(digit + index);
    }
  }
  return { ...map, ...(exceptions ?? {}) };
}

const BOLD = buildMap({ upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce });
const ITALIC = buildMap({
  upper: 0x1d434,
  lower: 0x1d44e,
  exceptions: { h: '\u210e' },
});
const BOLD_ITALIC = buildMap({ upper: 0x1d468, lower: 0x1d482 });
const SCRIPT = buildMap({
  upper: 0x1d49c,
  lower: 0x1d4b6,
  exceptions: {
    B: '\u212c',
    E: '\u2130',
    F: '\u2131',
    H: '\u210b',
    I: '\u2110',
    L: '\u2112',
    M: '\u2133',
    R: '\u211b',
    e: '\u212f',
    g: '\u210a',
    o: '\u2134',
  },
});
const BOLD_SCRIPT = buildMap({ upper: 0x1d4d0, lower: 0x1d4ea });
const DOUBLE = buildMap({
  upper: 0x1d538,
  lower: 0x1d552,
  digit: 0x1d7d8,
  exceptions: {
    C: '\u2102',
    H: '\u210d',
    N: '\u2115',
    P: '\u2119',
    Q: '\u211a',
    R: '\u211d',
    Z: '\u2124',
  },
});
const MONO = buildMap({ upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 });
const CIRCLED = buildMap({
  upper: 0x24b6,
  lower: 0x24d0,
  exceptions: {
    '0': '\u24ea',
    '1': '\u2460',
    '2': '\u2461',
    '3': '\u2462',
    '4': '\u2463',
    '5': '\u2464',
    '6': '\u2465',
    '7': '\u2466',
    '8': '\u2467',
    '9': '\u2468',
  },
});
const SQUARED = buildMap({ upper: 0x1f130, lower: 0x1f130 });

const SMALL_CAPS: Record<string, string> = {
  a: '\u1d00',
  b: '\u0299',
  c: '\u1d04',
  d: '\u1d05',
  e: '\u1d07',
  f: '\ua730',
  g: '\u0262',
  h: '\u029c',
  i: '\u026a',
  j: '\u1d0a',
  k: '\u1d0b',
  l: '\u029f',
  m: '\u1d0d',
  n: '\u0274',
  o: '\u1d0f',
  p: '\u1d18',
  q: '\u01eb',
  r: '\u0280',
  s: '\ua731',
  t: '\u1d1b',
  u: '\u1d1c',
  v: '\u1d20',
  w: '\u1d21',
  x: 'x',
  y: '\u028f',
  z: '\u1d22',
};

const UPSIDE_DOWN: Record<string, string> = {
  a: '\u0250',
  b: 'q',
  c: '\u0254',
  d: 'p',
  e: '\u01dd',
  f: '\u025f',
  g: '\u0183',
  h: '\u0265',
  i: '\u0131',
  j: '\u027e',
  k: '\u029e',
  l: '\u05df',
  m: '\u026f',
  n: 'u',
  o: 'o',
  p: 'd',
  q: 'b',
  r: '\u0279',
  s: 's',
  t: '\u0287',
  u: 'n',
  v: '\u028c',
  w: '\u028d',
  x: 'x',
  y: '\u028e',
  z: 'z',
  A: '\u2200',
  B: '\u0429',
  C: '\u0186',
  D: '\u15e1',
  E: '\u018e',
  F: '\u2132',
  G: '\u05e4',
  H: 'H',
  I: 'I',
  J: '\u017f',
  K: '\u029e',
  L: '\u2142',
  M: 'W',
  N: 'N',
  O: 'O',
  P: '\u0500',
  Q: '\u038c',
  R: '\u1d1a',
  S: 'S',
  T: '\u22a5',
  U: '\u2229',
  V: '\u039b',
  W: 'M',
  X: 'X',
  Y: '\u2144',
  Z: 'Z',
  '.': '\u02d9',
  ',': "'",
  "'": ',',
  '"': '\u201e',
  '?': '\u00bf',
  '!': '\u00a1',
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '&': '\u214b',
  '_': '\u203e',
  '<': '>',
  '>': '<',
};

const transformWith =
  (map: Record<string, string>) =>
  (text: string): string =>
    [...text].map((char) => map[char] ?? char).join('');

const fullwidth = (text: string): string =>
  [...text]
    .map((char) => {
      if (char === ' ') return '\u3000';
      const code = char.codePointAt(0)!;
      if (code >= 0x21 && code <= 0x7e) return String.fromCodePoint(code + 0xfee0);
      return char;
    })
    .join('');

const spaced = (text: string): string =>
  [...text]
    .map((char, index) => (index === 0 || char === ' ' ? char : `\u2009${char}`))
    .join('');

const combining = (mark: string) => (text: string): string =>
  [...text].map((char) => (char === ' ' || char === '\n' ? char : `${char}${mark}`)).join('');

const upsideDown = (text: string): string =>
  [...text]
    .reverse()
    .map((char) => UPSIDE_DOWN[char] ?? char)
    .join('');

/** Reverse maps for “back to plain text”. Flipped text is excluded on purpose:
 *  it swaps real letters (b↔q, n↔u), so reversing it would corrupt normal words. */
const REVERSE: Record<string, string> = {};
for (const map of [BOLD, ITALIC, BOLD_ITALIC, SCRIPT, BOLD_SCRIPT, DOUBLE, MONO, CIRCLED, SQUARED, SMALL_CAPS]) {
  for (const [plain, fancy] of Object.entries(map)) {
    if (fancy === plain) continue;
    if (!REVERSE[fancy]) REVERSE[fancy] = plain;
  }
}

const plain = (text: string): string =>
  [...text]
    .map((char) => REVERSE[char] ?? char)
    .join('')
    .replace(/[\u0336\u0332\u0305]/g, '');

export type TextStyleId =
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'script'
  | 'boldScript'
  | 'double'
  | 'mono'
  | 'smallCaps'
  | 'fullwidth'
  | 'circled'
  | 'squared'
  | 'spaced'
  | 'upsideDown'
  | 'strike'
  | 'underline';

export const TEXT_STYLES: { id: TextStyleId; label: string; sample: string; transform: (text: string) => string }[] = [
  { id: 'bold', label: 'Bold', sample: '𝐀𝐁𝐂', transform: transformWith(BOLD) },
  { id: 'italic', label: 'Italic', sample: '𝐴𝐵𝐶', transform: transformWith(ITALIC) },
  { id: 'boldItalic', label: 'Bold italic', sample: '𝑨𝑩𝑪', transform: transformWith(BOLD_ITALIC) },
  { id: 'script', label: 'Script', sample: '𝒜ℬ𝒞', transform: transformWith(SCRIPT) },
  { id: 'boldScript', label: 'Bold script', sample: '𝓐𝓑𝓒', transform: transformWith(BOLD_SCRIPT) },
  { id: 'double', label: 'Outline', sample: '𝔸𝔹ℂ', transform: transformWith(DOUBLE) },
  { id: 'mono', label: 'Mono', sample: '𝙰𝙱𝙲', transform: transformWith(MONO) },
  { id: 'smallCaps', label: 'Small caps', sample: 'ᴀʙᴄ', transform: transformWith(SMALL_CAPS) },
  { id: 'fullwidth', label: 'Wide', sample: 'ＡＢＣ', transform: fullwidth },
  { id: 'circled', label: 'Circled', sample: 'ⒶⒷⒸ', transform: transformWith(CIRCLED) },
  { id: 'squared', label: 'Squared', sample: '🄰🄱🄲', transform: transformWith(SQUARED) },
  { id: 'spaced', label: 'Spaced', sample: 'A B C', transform: spaced },
  { id: 'upsideDown', label: 'Upside down', sample: 'Ɔ𐐒∀', transform: upsideDown },
  { id: 'strike', label: 'Strike', sample: 'A̶B̶C̶', transform: combining('\u0336') },
  { id: 'underline', label: 'Underline', sample: 'A̲B̲C̲', transform: combining('\u0332') },
];

export const styleById = (id: TextStyleId) => TEXT_STYLES.find((style) => style.id === id);

export const toPlainText = plain;

/** Little helpers for structure – people keep typing these by hand. */
export const SEPARATORS = [
  { label: 'Rule', value: '\n\n———\n\n' },
  { label: 'Dots', value: '\n\n· · ·\n\n' },
  { label: 'Slash', value: '\n\n///\n\n' },
  { label: 'Bullets', value: '\n\n• \n• \n• ' },
  { label: 'Numbers', value: '\n\n1. \n2. \n3. ' },
  { label: 'Blank line', value: '\n\n' },
];
