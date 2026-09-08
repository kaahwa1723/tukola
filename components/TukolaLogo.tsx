'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Handshake } from 'lucide-react';

interface TukolaLogoProps {
  variant?: 'full' | 'mark' | 'wordmark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onDark?: boolean;
  className?: string;
}

const sizes = {
  sm: { imgFull: 140, imgMark: 40, title: 18, sub: 9, gap: 10 },
  md: { imgFull: 200, imgMark: 56, title: 26, sub: 11, gap: 12 },
  lg: { imgFull: 300, imgMark: 80, title: 38, sub: 13, gap: 16 },
  xl: { imgFull: 400, imgMark: 100, title: 48, sub: 15, gap: 18 },
};

export function TukolaLogo({ variant = 'full', size = 'md', onDark = false, className = '' }: TukolaLogoProps) {
  const s = sizes[size];
  const [markErr, setMarkErr] = useState(false);
  const [fullErr, setFullErr] = useState(false);

  const textColor = onDark ? '#ffffff' : '#2952E8';
  const subColor  = onDark ? 'rgba(255,255,255,0.55)' : '#8B94B8';

  const FallbackMark = () => (
    <div style={{
      width: s.imgMark, height: s.imgMark,
      borderRadius: Math.round(s.imgMark * 0.25),
      background: 'linear-gradient(135deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: onDark ? 'none' : '0 4px 16px rgba(41,82,232,0.35)',
    }}>
      <Handshake size={Math.round(s.imgMark * 0.55)} color="white" strokeWidth={1.8} />
    </div>
  );

  if (variant === 'mark') {
    if (markErr) return <FallbackMark />;
    return (
      <Image
        src="/icon.png"
        alt="TUKOLA"
        width={s.imgMark}
        height={s.imgMark}
        className={className}
        style={{ objectFit: 'contain', flexShrink: 0, width: s.imgMark, height: s.imgMark }}
        onError={() => setMarkErr(true)}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <span style={{
        fontFamily: "'Squartiqa4F','Orbitron',sans-serif",
        fontSize: s.title, fontWeight: 900,
        color: textColor, letterSpacing: '0.08em',
      }}>
        TUKOLA
      </span>
    );
  }

  if (!fullErr) {
    const src = onDark ? '/logo-white.png' : '/logo-gradient.png';
    return (
      <Image
        src={src}
        alt="TUKOLA"
        width={s.imgFull}
        height={s.imgFull}
        className={className}
        style={{ objectFit: 'contain', width: s.imgFull, height: 'auto' }}
        onError={() => setFullErr(true)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <FallbackMark />
      <div>
        <div style={{
          fontFamily: "'Squartiqa4F','Orbitron',sans-serif",
          fontSize: s.title, fontWeight: 900,
          color: textColor, letterSpacing: '0.06em', lineHeight: 1.1,
        }}>
          TUKOLA
        </div>
        <div style={{
          fontSize: s.sub, color: subColor,
          letterSpacing: '0.18em', textTransform: 'uppercase' as const,
          fontWeight: 600, marginTop: 2,
        }}>
          Uganda&apos;s Gig Platform
        </div>
      </div>
    </div>
  );
}
