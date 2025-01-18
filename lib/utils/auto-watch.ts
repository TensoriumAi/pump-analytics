import { db } from '../db';
import { TokenWatchMetrics, AutoWatchConfig } from '@/types/token';

const DEFAULT_CONFIG: AutoWatchConfig = {
  minInitialLPSol: 10,
  maxMcapLPRatio: 3.0,
  minTradesFirst2Min: 3,
  minVolumePerMin: 0.5,
  minBuySellRatio: 0.6,
  volumeDropThreshold: 20,
  maxInactiveSeconds: 120,
  priceDropThreshold: 30,
  walletConcentrationLimit: 50
};

export class AutoWatchManager {
  private metrics: Map<string, TokenWatchMetrics> = new Map();
  private config: AutoWatchConfig;

  constructor(config: Partial<AutoWatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async evaluateToken(mint: string): Promise<{ 
    shouldWatch: boolean;
    reason: string;
  }> {
    const metrics = await this.getTokenMetrics(mint);
    
    // Initial checks
    if (metrics.peakVolume < this.config.minVolumePerMin) {
      return { shouldWatch: false, reason: 'Insufficient volume' };
    }

    // Check trade frequency
    const recentTrades = metrics.tradeFrequency.slice(-2);
    if (recentTrades.length < this.config.minTradesFirst2Min) {
      return { shouldWatch: false, reason: 'Low trade frequency' };
    }

    // Check wallet concentration
    const maxConcentration = Math.max(...Array.from(metrics.walletConcentration.values()));
    if (maxConcentration > this.config.walletConcentrationLimit) {
      return { shouldWatch: false, reason: 'High wallet concentration' };
    }

    return { shouldWatch: true, reason: 'Meets watch criteria' };
  }

  async evaluateUnwatch(mint: string): Promise<{
    shouldUnwatch: boolean;
    reason: string;
  }> {
    const metrics = await this.getTokenMetrics(mint);
    
    // Check volume decline
    const currentVolume = metrics.volumeVelocity[metrics.volumeVelocity.length - 1] || 0;
    const volumeDrop = ((metrics.peakVolume - currentVolume) / metrics.peakVolume) * 100;
    if (volumeDrop > this.config.volumeDropThreshold) {
      return { shouldUnwatch: true, reason: `Volume dropped ${volumeDrop.toFixed(1)}%` };
    }

    // Check inactivity
    const inactiveTime = (Date.now() - metrics.lastTradeTime) / 1000;
    if (inactiveTime > this.config.maxInactiveSeconds) {
      return { shouldUnwatch: true, reason: `Inactive for ${inactiveTime.toFixed(0)}s` };
    }

    // Check price drop
    const priceDrop = ((metrics.peakPrice - metrics.lastPrice!) / metrics.peakPrice) * 100;
    if (priceDrop > this.config.priceDropThreshold) {
      return { shouldUnwatch: true, reason: `Price dropped ${priceDrop.toFixed(1)}%` };
    }

    return { shouldUnwatch: false, reason: 'Maintaining watch criteria' };
  }

  private async getTokenMetrics(mint: string): Promise<TokenWatchMetrics> {
    if (!this.metrics.has(mint)) {
      const dbMetrics = await db.watchMetrics.get(mint);
      
      if (dbMetrics) {
        // Convert database format to runtime format
        const metrics: TokenWatchMetrics = {
          ...dbMetrics,
          walletConcentration: new Map(JSON.parse(dbMetrics.walletConcentration))
        };
        this.metrics.set(mint, metrics);
      } else {
        const metrics = await this.calculateInitialMetrics(mint);
        
        // Save to database
        await db.watchMetrics.put({
          ...metrics,
          walletConcentration: JSON.stringify(Array.from(metrics.walletConcentration.entries())),
          lastUpdate: Date.now()
        });
        
        this.metrics.set(mint, metrics);
      }
    }
    
    return this.metrics.get(mint)!;
  }

  private async calculateInitialMetrics(mint: string): Promise<TokenWatchMetrics> {
    const trades = await db.orders
      .where('[tokenMint+timestamp]')
      .between([mint, Date.now() - 5 * 60 * 1000], [mint, Date.now()])
      .toArray();

    // Calculate metrics from trades
    const metrics: TokenWatchMetrics = {
      mint,
      createTime: Date.now(),
      watchStartTime: 0,
      peakVolume: 0,
      peakPrice: 0,
      lastPrice: 0,
      volumeVelocity: [],
      tradeFrequency: [],
      buyWallStrength: 0,
      lastTradeTime: 0,
      manipulationScore: 0,
      walletConcentration: new Map()
    };

    // Update metrics based on trades
    this.updateMetricsFromTrades(metrics, trades);
    
    return metrics;
  }

  private updateMetricsFromTrades(metrics: TokenWatchMetrics, trades: any[]) {
    // Implementation of metrics calculation
    // ... (detailed implementation would go here)
  }
}

// Export singleton instance
export const autoWatchManager = new AutoWatchManager(); 