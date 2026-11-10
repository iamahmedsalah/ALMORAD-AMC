'use client';

import { useEffect } from 'react';
import { getBrowserConsoleBanner } from '@amc/shared';

export function ConsoleBanner() {
  useEffect(() => {
    try {
      const { message, styles } = getBrowserConsoleBanner();
      console.log(message, ...styles);
    } catch {
      // Fallback silently if console formatting is unsupported
    }
  }, []);

  return null;
}
