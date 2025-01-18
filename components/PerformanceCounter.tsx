"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Pause, Play } from 'lucide-react';
import { wsService } from '@/lib/websocket';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface Stats {
  tokens: number;
  trades: number;
}

export function PerformanceCounter() {
  const [isPaused, setIsPaused] = useState(false);
  
  // Live query the database for stats
  const stats = useLiveQuery(async () => {
    const tokenCount = await db.tokens.count();
    const tradeCount = await db.orders.count();
    
    return {
      tokens: tokenCount,
      trades: tradeCount
    };
  }, [], { tokens: 0, trades: 0 });

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resume
      wsService.connect();
      wsService.setAutoResubscribe(true);
    } else {
      // Pause
      wsService.disconnect();
      wsService.setAutoResubscribe(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Realtime Blockchain Analytics
        </h1>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Tokens: {stats.tokens.toLocaleString()}</span>
          <span>•</span>
          <span>Trades: {stats.trades.toLocaleString()}</span>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="icon"
        onClick={togglePause}
        className="h-8 w-8"
      >
        {isPaused ? (
          <Play className="h-4 w-4" />
        ) : (
          <Pause className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
} 