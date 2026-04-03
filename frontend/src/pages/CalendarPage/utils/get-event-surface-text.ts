/**
 * Picks accessible foreground and related UI tokens for a solid event background.
 * Compares contrast vs white and vs near-black and chooses the stronger pairing.
 */

export type EventSurfaceText = {
  readonly foreground: string;
  readonly foregroundMuted: string;
  readonly borderSubtle: string;
  readonly handleSurface: string;
  readonly handleStrong: string;
};

const linearizeChannel = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const R = linearizeChannel(r);
  const G = linearizeChannel(g);
  const B = linearizeChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const getContrastRatio = (luminanceA: number, luminanceB: number): number => {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
};

const parseHex = (hex: string): readonly [number, number, number] | null => {
  const normalized = hex.trim().replace(/^#/, '');
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return [r, g, b];
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) {
      return null;
    }
    return [r, g, b];
  }
  return null;
};

const parseRgbFunction = (value: string): readonly [number, number, number] | null => {
  const match = value.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  if (!match) {
    return null;
  }
  const r = Math.round(Number.parseFloat(match[1]));
  const g = Math.round(Number.parseFloat(match[2]));
  const b = Math.round(Number.parseFloat(match[3]));
  if ([r, g, b].some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null;
  }
  return [r, g, b];
};

const parseCssColorToRgb = (color: string): readonly [number, number, number] | null => {
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    return parseHex(trimmed);
  }
  return parseRgbFunction(trimmed);
};

const LUM_WHITE = 1;
/** #0f172a — slate-900 */
const LUM_NEAR_BLACK = getRelativeLuminance(15, 23, 42);

const lightOnDarkExtras = (): Pick<
  EventSurfaceText,
  'borderSubtle' | 'handleSurface' | 'handleStrong'
> => ({
  borderSubtle: 'rgba(255, 255, 255, 0.22)',
  handleSurface: 'rgba(255, 255, 255, 0.35)',
  handleStrong: 'rgba(255, 255, 255, 0.85)',
});

const darkOnLightExtras = (): Pick<
  EventSurfaceText,
  'borderSubtle' | 'handleSurface' | 'handleStrong'
> => ({
  borderSubtle: 'rgba(15, 23, 42, 0.14)',
  handleSurface: 'rgba(15, 23, 42, 0.2)',
  handleStrong: 'rgba(15, 23, 42, 0.65)',
});

/**
 * Returns foreground and matching chrome colors for text on `backgroundCss` (hex or rgb/rgba).
 */
export const getEventSurfaceText = (backgroundCss: string): EventSurfaceText => {
  const rgb = parseCssColorToRgb(backgroundCss);
  if (!rgb) {
    return {
      foreground: '#ffffff',
      foregroundMuted: 'rgba(255, 255, 255, 0.92)',
      ...lightOnDarkExtras(),
    };
  }
  const lBg = getRelativeLuminance(rgb[0], rgb[1], rgb[2]);
  const contrastWhite = getContrastRatio(lBg, LUM_WHITE);
  const contrastDark = getContrastRatio(lBg, LUM_NEAR_BLACK);
  const useLightForeground = contrastWhite >= contrastDark;
  if (useLightForeground) {
    return {
      foreground: '#ffffff',
      foregroundMuted: 'rgba(255, 255, 255, 0.9)',
      ...lightOnDarkExtras(),
    };
  }
  return {
    foreground: '#0f172a',
    foregroundMuted: 'rgba(15, 23, 42, 0.78)',
    ...darkOnLightExtras(),
  };
};
