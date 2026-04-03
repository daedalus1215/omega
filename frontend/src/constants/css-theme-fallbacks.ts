/**
 * Hex fallbacks for `var(--token, …)` built in TypeScript (e.g. MUI `sx`).
 * Keep in sync with app chrome tokens in `src/index.css` (`:root` and `.dark`).
 */
export const CSS_THEME_HEX_FALLBACK = {
  primary: '#6366f1',
  text: '#18181b',
  /** Text/icons on solid `--color-primary` fills */
  onPrimary: '#ffffff',
} as const;

/**
 * Builds a CSS `var()` with a literal fallback (for environments without our `:root` tokens).
 */
export const cssVarWithFallback = (customProperty: string, fallback: string): string => {
  const name = customProperty.startsWith('--') ? customProperty : `--${customProperty}`;
  return `var(${name}, ${fallback})`;
};
