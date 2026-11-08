'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

/** One owner for the document icon, including metadata reinserted by navigation. */
export function ThemeFavicon() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  useEffect(() => {
    if (!resolvedTheme) return;
    const synchronize = () => {
      const href = resolvedTheme === 'dark' ? '/favicon-orange.svg' : '/favicon-light.svg';
      let link = document.head.querySelector<HTMLLinkElement>('link[data-amc-favicon]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.dataset.amcFavicon = 'true';
        document.head.appendChild(link);
      }
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
      document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]').forEach(other => {
        // Next owns metadata nodes and may remove them during navigation. Keep
        // those nodes attached so React can reconcile them safely.
        if (other !== link) other.rel = 'amc-inactive-icon';
      });
    };
    synchronize();
    const observer = new MutationObserver(synchronize);
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [resolvedTheme, pathname]);
  return null;
}
