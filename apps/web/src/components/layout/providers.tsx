'use client';

import { ThemeProvider } from 'next-themes';
import { DirectionProvider } from '@radix-ui/react-direction';
import { ThemeFavicon } from './theme-favicon';
import { ThemePaintGuard } from './theme-paint-guard';

export function Providers({
  children,
  dir,
}: {
  children: React.ReactNode;
  dir: 'rtl' | 'ltr';
}) {
  return (
    <DirectionProvider dir={dir}>
      <ThemeProvider attribute={['class', 'data-theme']} defaultTheme="system" enableSystem disableTransitionOnChange>
        <ThemePaintGuard />
        <ThemeFavicon />
        {children}
      </ThemeProvider>
    </DirectionProvider>
  );
}
