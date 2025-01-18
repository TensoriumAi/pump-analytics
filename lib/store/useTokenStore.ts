"use client";

import { create } from 'zustand';
import { Token, WatchStatus } from '@/types/token';
import { db } from '../db';
import { wsService } from '@/lib/websocket';
import { toast } from "@/components/ui/use-toast";

interface TokenStore {
  tokens: Map<string, Token>;
  watchedTokens: Set<string>;
  loading: boolean;
  error: string | null;
  actions: {
    watchToken: (mint: string) => Promise<void>;
    unwatchToken: (mint: string) => Promise<void>;
    updateToken: (data: Token) => Promise<void>;
    loadTokens: () => Promise<void>;
  };
  addWatchedToken: (mint: string) => Promise<void>;
  watchSimilarNames: boolean;
  setWatchSimilarNames: (enabled: boolean) => void;
  pruneStats: PruneStats;
  pruneInterval: NodeJS.Timer | null;
  startPruneInterval: (minutes: number) => void;
  stopPruneInterval: () => void;
  watchToken: (token: Token) => void;
  unwatchToken: (mint: string) => void;
}

interface PruneStats {
  tokens: number;
  orphanedTrades: number;
  lastRun: number | null;
}

export const useTokenStore = create<TokenStore>((set, get) => ({
  tokens: new Map(),
  watchedTokens: new Set(),
  loading: true,
  error: null,
  actions: {
    watchToken: async (mint: string) => {
      set(state => {
        // Update watchedTokens first
        const newWatched = new Set(state.watchedTokens);
        newWatched.add(mint);
        
        // Then update the token's status
        const newTokens = new Map(state.tokens);
        const token = newTokens.get(mint);
        if (token) {
          newTokens.set(mint, {
            ...token,
            watchStatus: 'watched',
            lastUpdate: Date.now()
          });
        }
        
        return {
          watchedTokens: newWatched,
          tokens: newTokens
        };
      });
    },
    unwatchToken: async (mint: string) => {
      set(state => {
        // Update watchedTokens first
        const newWatched = new Set(state.watchedTokens);
        newWatched.delete(mint);
        
        // Then update the token's status
        const newTokens = new Map(state.tokens);
        const token = newTokens.get(mint);
        if (token) {
          newTokens.set(mint, {
            ...token,
            watchStatus: 'unwatched',
            lastUpdate: Date.now()
          });
        }
        
        return {
          watchedTokens: newWatched,
          tokens: newTokens
        };
      });
    },
    updateToken: async (data: Token) => {
      set(state => {
        const newTokens = new Map(state.tokens);
        const existing = newTokens.get(data.mint);
        if (!existing || data.lastUpdate > existing.lastUpdate) {
          newTokens.set(data.mint, {
            ...data,
            watchStatus: existing?.watchStatus || 'unwatched',
            createTime: existing?.createTime || Date.now(),
            lastUpdate: Date.now()
          });
        }
        return { tokens: newTokens };
      });
    },
    loadTokens: async () => {
      set({ loading: true, error: null });
      
      try {
        console.log('🔄 Loading tokens from database...');
        const tokens = await db.tokens.toArray();
        console.log(`📦 Found ${tokens.length} tokens`);
        
        const tokenMap = new Map(tokens.map((t: Token) => [t.mint, t]));
        const watched = new Set(
          tokens
            .filter((t: Token) => t.watchStatus === 'watched')
            .map((t: Token) => t.mint)
        );
        
        set({ 
          tokens: tokenMap as Map<string, any>, 
          watchedTokens: watched as Set<string>, 
          loading: false 
        });
        
        console.log('✅ Tokens loaded successfully');
      } catch (error) {
        console.error('❌ Error loading tokens:', error);
        set({ 
          error: (error as Error).message, 
          loading: false,
          tokens: new Map(),
          watchedTokens: new Set()
        });
      }
    }
  },
  addWatchedToken: async (mint: string) => {
    const state = get();
    console.log('Adding token:', mint);
    console.log('Watch similar names enabled:', state.watchSimilarNames);
    
    const newWatched = new Set(state.watchedTokens);
    newWatched.add(mint);

    if (state.watchSimilarNames) {
      try {
        // Get all tokens
        const tokens = await db.tokens.toArray();
        console.log('Total tokens found:', tokens.length);
        
        // Find the token being watched
        const watchedToken = tokens.find((t: Token) => t.mint === mint);
        console.log('Watched token:', watchedToken);
        
        if (watchedToken?.name) {
          // Find all tokens with the same name
          const similarTokens = tokens.filter((t: Token) => {
            const matches = t.name.toLowerCase() === watchedToken.name.toLowerCase() && 
                          t.mint !== mint;
            if (matches) {
              console.log('Found similar token:', t.name, t.mint);
            }
            return matches;
          });
          
          console.log('Similar tokens found:', similarTokens.length);
          
          // Add all similar tokens to watched set
          similarTokens.forEach((token: Token) => {
            console.log('Adding similar token to watch list:', token.name, token.mint);
            newWatched.add(token.mint);
          });
        }
      } catch (error) {
        console.error('Error adding similar tokens:', error);
      }
    }

    console.log('Final watched tokens:', Array.from(newWatched));
    set({ watchedTokens: newWatched });
  },
  watchSimilarNames: false,
  setWatchSimilarNames: (enabled) => {
    console.log('Setting watch similar names:', enabled);
    set({ watchSimilarNames: enabled });
  },
  pruneStats: { tokens: 0, orphanedTrades: 0, lastRun: null },
  pruneInterval: null,
  startPruneInterval: (minutes: number) => {
    const { stopPruneInterval } = get();
    stopPruneInterval();
    
    if (minutes <= 0) return;
    
    const pruneTokens = async () => {
      console.log('Running pruner...');
      const cutoff = Date.now() - (minutes * 60 * 1000);
      
      // Find stale tokens
      const staleTokens = await db.tokens
        .where('lastUpdate')
        .below(cutoff)
        .toArray();
      
      console.log(`Found ${staleTokens.length} stale tokens`);
      
      if (staleTokens.length > 0) {
        const staleMintsSet = new Set(staleTokens.map((t: Token) => t.mint));
        
        // First, get all associated trades
        const staleTrades = await db.orders
          .where('tokenMint')
          .anyOf([...staleMintsSet])
          .toArray();
        
        // Execute deletion in a transaction
        await db.transaction('rw', [db.tokens, db.orders], async () => {
          // Remove tokens
          await db.tokens
            .where('mint')
            .anyOf([...staleMintsSet])
            .delete();
            
          // Remove associated trades
          await db.orders
            .where('tokenMint')
            .anyOf([...staleMintsSet])
            .delete();
        });
          
        // Remove from store and unsubscribe
        set(state => {
          const newTokens = new Map(state.tokens);
          staleTokens.forEach((token: Token) => {
            newTokens.delete(token.mint);
            wsService.unsubscribeFromToken(token.mint);
          });
          return { tokens: newTokens };
        });
        
        toast({
          title: "Pruning Complete",
          description: `Removed ${staleTokens.length} inactive tokens and ${staleTrades.length} associated trades`
        });
      }
    };
    
    // Run initial prune
    pruneTokens();
    
    // Set up interval
    const interval = setInterval(pruneTokens, 60 * 1000);
    set({ pruneInterval: interval });
    
    console.log(`Pruner started with ${minutes} minute threshold`);
  },
  stopPruneInterval: () => {
    const { pruneInterval } = get();
    if (pruneInterval) {
      clearInterval(pruneInterval as unknown as NodeJS.Timeout);
      set({ pruneInterval: null });
      console.log('Pruner stopped');
    }
  },
  watchToken: (token: Token) => {
    set(state => {
      const updatedToken = { ...token, watchStatus: 'watched' as const };
      
      // Update in memory
      const newTokens = new Map(state.tokens);
      newTokens.set(token.mint, updatedToken);
      
      // Update in DB
      db.tokens.update(token.mint, { watchStatus: 'watched' });
      
      return { tokens: newTokens };
    });
  },
  unwatchToken: (mint: string) => {
    set(state => {
      const token = state.tokens.get(mint);
      if (!token) return state;

      const updatedToken = { ...token, watchStatus: 'unwatched' as const };
      
      // Update in memory
      const newTokens = new Map(state.tokens);
      newTokens.set(mint, updatedToken);
      
      // Update in DB
      db.tokens.update(mint, { watchStatus: 'unwatched' });
      
      return { tokens: newTokens };
    });
  },
})); 