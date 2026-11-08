'use client';

import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({
  size = 20,
  className,
  strokeWidth = 1.6,
  children,
  fill = 'none',
}: IconProps & { children: ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const IconLayout = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.4" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2.4" />
    <circle cx="8.5" cy="9" r="1.6" />
    <path d="m4 17 4.5-4.5L13 17l3-3 4 4" />
  </Svg>
);

export const IconNote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3.5h8.5L19 9v11.5H5z" />
    <path d="M13.5 3.5V9H19" />
    <path d="M8.5 13h7M8.5 17h4.5" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M12 2.5v2.7M12 18.8v2.7M4.3 4.3l1.9 1.9M17.8 17.8l1.9 1.9M2.5 12h2.7M18.8 12h2.7M4.3 19.7l1.9-1.9M17.8 6.2l1.9-1.9" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Svg>
);

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 15v3.2A2.8 2.8 0 0 0 6.8 21h10.4A2.8 2.8 0 0 0 20 18.2V15" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 16v2.2A2.8 2.8 0 0 0 6.8 21h10.4A2.8 2.8 0 0 0 20 18.2V16" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9.5 7V4h5v3" />
    <path d="m6.5 7 1 13.2A1 1 0 0 0 8.5 21h7a1 1 0 0 0 1-.8L17.5 7" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m14.5 5.5 4 4" />
  </Svg>
);

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.4S3.5 15.3 3.5 9.8A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.5 2.6c0 5.5-8.5 10.6-8.5 10.6z" />
  </Svg>
);

export const IconComment = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 11.6c0 4.2-4 7.6-9 7.6a10.8 10.8 0 0 1-3-.4L4.5 21l1-4.2A7.2 7.2 0 0 1 3 11.6C3 7.4 7 4 12 4s9 3.4 9 7.6z" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21.5 2.5 10.8 13.2" />
    <path d="M21.5 2.5 15 21l-4.2-7.8L3 9z" />
  </Svg>
);

export const IconBookmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12V21l-6-4.2L6 21z" />
  </Svg>
);

export const IconDots = (p: IconProps) => (
  <Svg {...p} strokeWidth={0} fill="currentColor">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 5 7 7-7 7" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 9.5 7 7 7-7" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5L20 6.5" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
  </Svg>
);

export const IconMusic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18V6.5l11-2V16" />
    <circle cx="6.2" cy="18.4" r="2.6" />
    <circle cx="17.2" cy="16.4" r="2.6" />
    <path d="m9 10.5 11-2" />
  </Svg>
);

export const IconMapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 10.4c0 5.9-8 11.6-8 11.6S4 16.3 4 10.4a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10.2" r="2.6" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3.5h6l-.8 5.6 3.8 4H6l3.8-4z" />
    <path d="M12 13v7" />
  </Svg>
);

export const IconDrag = (p: IconProps) => (
  <Svg {...p} strokeWidth={0} fill="currentColor">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M15 5.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5" />
  </Svg>
);

export const IconLayers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 4.8-9 4.8-9-4.8z" />
    <path d="m3 12.4 9 4.8 9-4.8" />
    <path d="m3 16.8 9 4.8 9-4.8" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p} strokeWidth={0} fill="currentColor">
    <path d="M8 5.2 19 12 8 18.8z" />
  </Svg>
);

export const IconFilm = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </Svg>
);

export const IconSparkles = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 13.6 9l5.4 1.7-5.4 1.8L12 18l-1.6-5.5L5 10.7 10.4 9z" />
    <path d="M18.5 15.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
  </Svg>
);

export const IconFolder = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6.8A1.8 1.8 0 0 1 5.3 5h4l2 2.4h7.4a1.8 1.8 0 0 1 1.8 1.8v8.9A1.9 1.9 0 0 1 18.6 20H5.4a1.9 1.9 0 0 1-1.9-1.9z" />
  </Svg>
);

export const IconHash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 9h15M4 15h15M10 3.5 8 20.5M16.5 3.5l-2 17" />
  </Svg>
);

export const IconBold = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5h6a3.8 3.8 0 0 1 0 7.5H7z" />
    <path d="M7 12h6.8a3.9 3.9 0 0 1 0 7.7H7z" />
  </Svg>
);

export const IconItalic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4.5H9M15 19.5H9M14 4.5 10 19.5" />
  </Svg>
);

export const IconUnderline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4v6.5a5.5 5.5 0 0 0 11 0V4" />
    <path d="M5 20h14" />
  </Svg>
);

export const IconStrike = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="M8 7.5C8 5.5 9.8 4 12.4 4S17 5.4 17 7.5M7 16.5C7 18.5 9 20 12.2 20s5.3-1.4 5.3-3.5" />
  </Svg>
);

export const IconList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.6" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.6" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.6" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconListOrdered = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6.5h10M10 12h10M10 17.5h10" />
    <path d="M4 5.5h1.4v3.2M3.6 15.2h2.1l-2 2.6h2.1" />
  </Svg>
);

export const IconTask = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="6" height="6" rx="1.4" />
    <rect x="3.5" y="13.5" width="6" height="6" rx="1.4" />
    <path d="m5.2 7.4 1.2 1.2 2-2.2M13 7.5h7.5M13 16.5h7.5" />
  </Svg>
);

export const IconQuote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6.5C6 7.5 4.5 10 4.5 13v4.5H9V13H6.8c0-2 .8-3.5 2.2-4.3z" />
    <path d="M19 6.5c-3 1-4.5 3.5-4.5 6.5v4.5H19V13h-2.2c0-2 .8-3.5 2.2-4.3z" />
  </Svg>
);

export const IconCode = (p: IconProps) => (
  <Svg {...p}>
    <path d="m8.5 8-4.5 4 4.5 4M15.5 8l4.5 4-4.5 4" />
  </Svg>
);

export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13.5a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.4 5.7" />
    <path d="M14 10.5a4.5 4.5 0 0 0-6.4 0l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
  </Svg>
);

export const IconHighlight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h6l9.5-9.5a2.6 2.6 0 0 0-3.7-3.7L6 16.3z" />
    <path d="m13.5 7.5 3.7 3.7" />
  </Svg>
);

export const IconAlignLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </Svg>
);

export const IconAlignCenter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M6 18h12" />
  </Svg>
);

export const IconAlignRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M10 12h10M7 18h13" />
  </Svg>
);

export const IconUndo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 7 4.5 11.5 9 16" />
    <path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-1.5" />
  </Svg>
);

export const IconRedo = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 7 4.5 4.5L15 16" />
    <path d="M19.5 11.5H10a5.5 5.5 0 0 0 0 11h1.5" />
  </Svg>
);

export const IconHeading = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 5v14M18 5v14M6 12h12" />
  </Svg>
);

export const IconInstagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
    <circle cx="12" cy="12" r="4.1" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17l-6.6 7.6V20l-3.8-2v-4.9z" />
  </Svg>
);

export const IconZap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </Svg>
);

export const IconDatabase = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="5.8" rx="8" ry="3" />
    <path d="M4 5.8v12.4c0 1.7 3.6 3 8 3s8-1.3 8-3V5.8" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </Svg>
);

export const IconType = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5h14M12 5v14M8 19h8" />
  </Svg>
);

export const IconSquare = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
  </Svg>
);

export const IconStar = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8-4.3-4.1 5.9-.8z" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </Svg>
);

export const IconUnlock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4" />
    <path d="M8 10.5V7.8a4 4 0 0 1 7.4-2" />
  </Svg>
);

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.9M6.4 7.9A17.5 17.5 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.4-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Svg>
);

export const IconRotate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M20 3.5V8h-4.5" />
  </Svg>
);

export const IconAlignTop = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h16M12 8v12M8.5 11.5 12 8l3.5 3.5" />
  </Svg>
);

export const IconAlignMiddle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M12 4v5M12 15v5M8.5 7.5 12 4l3.5 3.5M8.5 16.5 12 20l3.5-3.5" />
  </Svg>
);

export const IconAlignBottom = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h16M12 4v12M8.5 12.5 12 16l3.5-3.5" />
  </Svg>
);

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
  </Svg>
);

export const IconArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />
  </Svg>
);

export const IconBringFront = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M4 16V5.5A1.5 1.5 0 0 1 5.5 4H16" />
  </Svg>
);

export const IconSendBack = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="12" height="12" rx="2" />
    <path d="M20 8v10.5a1.5 1.5 0 0 1-1.5 1.5H8" />
  </Svg>
);

export const IconDocument = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </Svg>
);

export const IconTable = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 10v10M15 10v10" />
  </Svg>
);

export const IconSwatch = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="8" height="8" rx="2" />
    <rect x="12.5" y="3.5" width="8" height="8" rx="2" />
    <rect x="3.5" y="12.5" width="8" height="8" rx="2" />
    <path d="M16.5 13.5v6M13.5 16.5h6" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.4 12h17.2" />
    <path d="M12 3.4c2.2 2.3 3.4 5.3 3.4 8.6s-1.2 6.3-3.4 8.6c-2.2-2.3-3.4-5.3-3.4-8.6S9.8 5.7 12 3.4z" />
  </Svg>
);
