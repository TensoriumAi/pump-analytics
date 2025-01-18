import { create } from 'zustand';

interface Sol2UsdState {
  price: number;
  lastUpdate: number;
  isLoading: boolean;
  error: string | null;
  actions: {
    getPrice: () => Promise<number>;
    forceUpdate: () => Promise<void>;
  };
}

const RATE_LIMIT = 30 * 1000; // 30 seconds
const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

export const useSol2Usd = create<Sol2UsdState>((set, get) => ({
  price: 0,
  lastUpdate: 0,
  isLoading: false,
  error: null,
  actions: {
    getPrice: async () => {
      const { lastUpdate, price } = get();
      const now = Date.now();
      
      // Return cached price if within rate limit
      if (now - lastUpdate < RATE_LIMIT) {
        return price;
      }
      
      // Force update if cache expired
      await get().actions.forceUpdate();
      return get().price;
    },
    
    forceUpdate: async () => {
      const now = Date.now();
      const { lastUpdate } = get();
      
      // Prevent concurrent updates
      if (now - lastUpdate < RATE_LIMIT) {
        throw new Error(`Rate limited. Please wait ${((RATE_LIMIT - (now - lastUpdate)) / 1000).toFixed(1)} seconds`);
      }
      
      set({ isLoading: true, error: null });
      
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        set({
          price: data.solana.usd,
          lastUpdate: now,
          isLoading: false
        });
      } catch (error) {
        set({
          error: (error as Error).message,
          isLoading: false
        });
        throw error;
      }
    }
  }
})); 