"use client";

import { wsService } from '../../lib/websocket';
import { useTokenStore } from '../../lib/store/useTokenStore';
import { useEffect, useState } from "react";
import { isDatabaseReady } from '../../lib/db';
import { Token } from '@/types/token';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { actions } = useTokenStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Wait for database to be ready
        const dbReady = await isDatabaseReady();
        if (!dbReady) {
          throw new Error('Database failed to initialize');
        }

        // Connect to WebSocket
        wsService.connect();

        // Subscribe to WebSocket events
        const unsubscribe = wsService.subscribe((event) => {
          if (event.type === 'create') {
            actions.updateToken(event.data as Token);
          }
        });

        // Load existing tokens
        await actions.loadTokens();
        
        setInitialized(true);

        return () => {
          unsubscribe();
          wsService.disconnect();
        };
      } catch (error) {
        console.error('Failed to initialize:', error);
        setInitialized(true); // Still set initialized to prevent hanging
      }
    }

    init();
  }, []);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-muted-foreground">
          <div className="animate-pulse">Initializing database...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 