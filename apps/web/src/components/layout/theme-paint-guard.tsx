'use client';
import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

export function ThemePaintGuard() {
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();
  useLayoutEffect(() => {
    let preference = theme;
    try { preference = preference || localStorage.getItem('theme') || 'system'; } catch { preference ||= 'system'; }
    const resolved = preference === 'dark' || preference === 'light'
      ? preference : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolved);
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }, [pathname, theme, resolvedTheme]);
  return null;
}
