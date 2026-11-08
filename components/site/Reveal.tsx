'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Fades a block in when it scrolls into view – once, slowly, no bouncing. */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  href,
  style,
}: {
  children: ReactNode;
  delay?: number;
  as?: any;
  className?: string;
  href?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as any}
      href={href}
      target={href && !href.startsWith('mailto:') ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      className={`reveal ${shown ? 'in' : ''} ${className}`.trim()}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
