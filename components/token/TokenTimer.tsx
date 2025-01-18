"use client";

import { memo, useEffect, useState } from 'react';
import { formatTimeAgo } from '@/lib/utils';

interface TokenTimerProps {
  timestamp: number;
  className?: string;
}

export const TokenTimer = memo(function TokenTimer({ timestamp, className }: TokenTimerProps) {
  const [timeDisplay, setTimeDisplay] = useState(() => formatTimeAgo(timestamp));

  useEffect(() => {
    setTimeDisplay(formatTimeAgo(timestamp));
    const interval = setInterval(() => {
      setTimeDisplay(formatTimeAgo(timestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return <div className={className}>{timeDisplay}</div>;
}); 