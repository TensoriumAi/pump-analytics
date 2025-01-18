import { db } from '../db';

export class MetricsCalculator {
  private cache = new Map<string, {
    value: number;
    timestamp: number;
    metric: string;
    timeWindow: number;
  }>();

  private CACHE_TTL = 1000; // 1 second cache

  private async getCachedOrCalculate(
    key: string,
    timeWindow: number,
    calculator: () => Promise<number>
  ): Promise<number> {
    const cacheKey = `${key}-${timeWindow}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    const value = await calculator();
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      metric: key,
      timeWindow
    });

    return value;
  }

  async getBuyCount(mint: string, timeWindow: number): Promise<number> {
    return this.getCachedOrCalculate(
      `buyCount-${mint}`,
      timeWindow,
      async () => {
        const startTime = Date.now() - timeWindow;
        return await db.orders
          .where('tokenMint')
          .equals(mint)
          .and(t => t.timestamp > startTime && t.type === 'buy')
          .count();
      }
    );
  }

  async getVolumeRate(mint: string, timeWindow: number): Promise<number> {
    return this.getCachedOrCalculate(
      `volumeRate-${mint}`,
      timeWindow,
      async () => {
        const startTime = Date.now() - timeWindow;
        const trades = await db.orders
          .where('tokenMint')
          .equals(mint)
          .and(t => t.timestamp > startTime)
          .toArray();

        const totalVolume = trades.reduce((sum, t) => sum + (t.volume || 0), 0);
        return (totalVolume / timeWindow) * 60000; // Convert to per minute
      }
    );
  }

  async getPriceChange(mint: string, timeWindow: number): Promise<number> {
    return this.getCachedOrCalculate(
      `priceChange-${mint}`,
      timeWindow,
      async () => {
        const startTime = Date.now() - timeWindow;
        const trades = await db.orders
          .where('tokenMint')
          .equals(mint)
          .and(t => t.timestamp > startTime)
          .reverse()
          .toArray();

        if (trades.length < 2) return 0;

        const oldestPrice = trades[trades.length - 1].price;
        const latestPrice = trades[0].price;
        return ((latestPrice - oldestPrice) / oldestPrice) * 100;
      }
    );
  }

  async getTradeFrequency(mint: string, timeWindow: number): Promise<number> {
    return this.getCachedOrCalculate(
      `tradeFrequency-${mint}`,
      timeWindow,
      async () => {
        const startTime = Date.now() - timeWindow;
        const count = await db.orders
          .where('tokenMint')
          .equals(mint)
          .and(t => t.timestamp > startTime)
          .count();

        return (count / timeWindow) * 60000; // Convert to trades per minute
      }
    );
  }
}

export const metricsCalculator = new MetricsCalculator(); 