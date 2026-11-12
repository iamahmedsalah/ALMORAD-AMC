'use client';

import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
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
  const [queryClient] = useState(() => new QueryClient({defaultOptions: {queries: {retry: false, refetchOnWindowFocus: false, gcTime: 60000}}}));
  return (
    <QueryClientProvider client={queryClient}>
    <DirectionProvider dir={dir}>
      <ThemeProvider attribute={['class', 'data-theme']} defaultTheme="system" enableSystem disableTransitionOnChange>
        <ThemePaintGuard />
        <ThemeFavicon />
        {children}
      </ThemeProvider>
    </DirectionProvider>
    </QueryClientProvider>
  );
}
