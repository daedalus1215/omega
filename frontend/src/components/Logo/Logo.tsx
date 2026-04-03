import React from 'react';
import fullLogoSrc from '../../assets/omega-calendar-logo.png?url';
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
  const logoSrc = variant === 'mark' ? markLogoSrc : fullLogoSrc;
  const height = heightProp ?? defaultHeightForVariant(variant);
  const classNames = [styles.logo, className].filter(Boolean).join(' ');
  return (
    <img
      src={logoSrc}
      alt={alt}
      className={classNames}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: 'auto' }}
    />
  );
};
