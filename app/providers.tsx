"use client";

import { useEffect } from 'react';
import { usePriceStore } from '../lib/store/usePriceStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const { actions } = usePriceStore();

  useEffect(() => {
    // Fetch initial price
    actions.fetchSolPrice();

    // Update price every 5 minutes
    const interval = setInterval(() => {
      actions.fetchSolPrice();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [actions]);

  return <>{children}</>;
} 