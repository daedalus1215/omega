import React from 'react';
import markLogoSrc from '../../assets/omega-mark.svg?url';
import styles from './Logo.module.css';

type LogoVariant = 'full' | 'mark';

type LogoProps = {
  variant?: LogoVariant;
  /** CSS length, e.g. 64 or "clamp(80px, 22vmin, 120px)". Omit for variant-based default. */
  height?: number | string;
  className?: string;
  alt?: string;
};

const defaultHeightForVariant = (variant: LogoVariant): number =>
  variant === 'mark' ? 56 : 40;

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  height: heightProp,
  className = '',
  alt = 'Omega',
}: LogoProps) => {
  const height = heightProp ?? defaultHeightForVariant(variant);
  const cssHeight = typeof height === 'number' ? `${height}px` : height;
  if (variant === 'mark') {
    return (
      <img
        src={markLogoSrc}
        alt={alt}
        className={[styles.logo, className].filter(Boolean).join(' ')}
        style={{ height: cssHeight, width: 'auto' }}
      />
    );
  }
  // The mark over the name. The name is text, so it follows the theme's
  // text color; both parts are sized from the logo's height.
  return (
    <span
      role="img"
      aria-label={alt}
      className={[styles.logo, styles.full, className].filter(Boolean).join(' ')}
      style={{ '--logo-height': cssHeight } as React.CSSProperties}
    >
      <img src={markLogoSrc} alt="" className={styles.fullMark} />
      <span className={styles.wordmark} aria-hidden="true">
        Omega
      </span>
    </span>
  );
};
