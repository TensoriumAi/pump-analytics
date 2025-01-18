"use client";

import { useEffect, useMemo } from "react";
import { useTokenStore } from "@/lib/store/useTokenStore";
import { TokenCard } from "./TokenCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { wsService } from "@/lib/websocket";

export function TokenList() {
  const tokens = useTokenStore(state => state.tokens);
  
  // Convert Map to Array and filter for watched tokens
  const watchedTokens = useMemo(() => 
    Array.from(tokens.values())
      .filter(token => token.watchStatus === 'watched')
      .sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0)),
    [tokens]
  );

  // All tokens sorted by lastUpdate
  const allTokens = useMemo(() => 
    Array.from(tokens.values())
      .sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0)),
    [tokens]
  );

  // Hot tokens (high activity in last hour)
  const hotTokens = useMemo(() => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return Array.from(tokens.values())
      .filter(token => {
        const metrics = token.metrics;
        if (!metrics) return false;
        return (token.lastUpdate || 0) > hourAgo && 
               (metrics.tradeFrequency > 0.5 || // More than 1 trade per 2 hours
                metrics.volumeRate > 0.1); // More than 0.1 SOL volume
      })
      .sort((a, b) => {
        const aMetrics = a.metrics || { volumeRate: 0, tradeFrequency: 0 };
        const bMetrics = b.metrics || { volumeRate: 0, tradeFrequency: 0 };
        return (bMetrics.volumeRate + bMetrics.tradeFrequency) - 
               (aMetrics.volumeRate + aMetrics.tradeFrequency);
      });
  }, [tokens]);

  // New tokens (created in last hour)
  const newTokens = useMemo(() => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return Array.from(tokens.values())
      .filter(token => (token.createTime || 0) > hourAgo)
      .sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
  }, [tokens]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = wsService.subscribe((event: any) => {
      if (event.type === 'create') {
        wsService.log('🆕 New token created:', event.data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Tabs defaultValue="watched" className="w-full px-4">
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="watched">
          Watched ({watchedTokens.length})
        </TabsTrigger>
        <TabsTrigger value="hot">
          Hot ({hotTokens.length})
        </TabsTrigger>
        <TabsTrigger value="new">
          New ({newTokens.length})
        </TabsTrigger>
        <TabsTrigger value="all">
          All ({allTokens.length})
        </TabsTrigger>
      </TabsList>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <TabsContent value="watched" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
            {watchedTokens.map(token => (
              <TokenCard 
                key={token.mint} 
                token={token}
              />
            ))}
            {watchedTokens.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground p-4">
                No watched tokens. Click the star icon to watch tokens.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hot" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
            {hotTokens.map(token => (
              <TokenCard 
                key={token.mint} 
                token={token}
              />
            ))}
            {hotTokens.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground p-4">
                No hot tokens right now.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="new" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
            {newTokens.map(token => (
              <TokenCard 
                key={token.mint} 
                token={token}
              />
            ))}
            {newTokens.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground p-4">
                No new tokens in the last hour.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
            {allTokens.map(token => (
              <TokenCard 
                key={token.mint} 
                token={token}
              />
            ))}
            {allTokens.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground p-4">
                No tokens found.
              </div>
            )}
          </div>
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
} 