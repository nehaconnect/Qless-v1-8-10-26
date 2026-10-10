export type QLessTheme = 'pastel' | 'blue';

/**
 * Returns the active QLess theme based on NEXT_PUBLIC_QLess_THEME environment variable.
 * Fallback is 'pastel' per user requirements.
 * When NEXT_PUBLIC_QLess_THEME=blue, returns 'blue'.
 */
export function getActiveTheme(): QLessTheme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement?.getAttribute('data-theme');
    if (attr === 'blue' || attr === 'pastel') {
      return attr;
    }
  }

  const envTheme =
    process.env.NEXT_PUBLIC_QLess_THEME ||
    process.env.NEXT_PUBLIC_QLESS_THEME;

  if (envTheme === 'blue') {
    return 'blue';
  }
  return 'pastel';
}
