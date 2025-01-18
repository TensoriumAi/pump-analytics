"use client";

import { create } from 'zustand';

interface PriceStore {
  solPrice: number;
  lastUpdate: number | null;
  loading: boolean;
  error: string | null;
  actions: {
    fetchSolPrice: () => Promise<void>;
  };
}

export const usePriceStore = create<PriceStore>((set) => ({
  solPrice: 0,
  lastUpdate: null,
  loading: false,
  error: null,
  actions: {
    fetchSolPrice: async () => {
      try {
        set({ loading: true, error: null });
        
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (!response.ok) {
          throw new Error('Failed to fetch SOL price');
        }
        
        const data = await response.json();
        set({ 
          solPrice: data.solana.usd,
          lastUpdate: Date.now(),
          loading: false 
        });
      } catch (error) {
        console.error('Error fetching SOL price:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to fetch price',
          loading: false 
        });
      }
    }
  }
})); 