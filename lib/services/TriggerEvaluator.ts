import { TriggerCondition, TriggerGroup } from '@/types/triggers';
import { useTokenStore } from "@/lib/store/useTokenStore";

interface PendingTrigger {
  group: TriggerGroup;
  tradeData: any;
  timestamp: number;
}

export class TriggerEvaluator {
  private evaluationQueue: Array<{group: TriggerGroup, data: any}> = [];
  private processing = false;
  private tradeHistory: Map<string, TradeEvent[]> = new Map();
  private readonly TRADE_WINDOW = 60 * 60 * 1000;
  private processedCount = 0;
  private lastTriggerTime: number | null = null;

  constructor() {
    this.startQueueProcessor();
    console.log('🎯 TriggerEvaluator initialized');
  }

  private startQueueProcessor() {
    setInterval(() => this.processQueue(), 100); // Process queue every 100ms
  }

  private async processQueue() {
    if (this.processing || this.evaluationQueue.length === 0) return;
    
    this.processing = true;
    
    try {
      while (this.evaluationQueue.length > 0) {
        const {group, data} = this.evaluationQueue.shift()!;
        await this.evaluateGroup(group, data);
        this.processedCount++;
        this.lastTriggerTime = Date.now();
      }
    } finally {
      this.processing = false;
    }
  }

  public async evaluateGroup(group: TriggerGroup, tradeData: any) {
    const results = await Promise.all(
      group.conditions.map((condition: TriggerCondition) => this.evaluateCondition(condition, tradeData))
    );

    // Apply AND/OR logic
    const groupMatches = group.operator === 'AND' 
      ? results.every((r: boolean) => r)
      : results.some((r: boolean) => r);

    if (groupMatches) {
      // Handle matched trigger group
      if (group.type === 'watch') {
        // Add to watched tokens
        useTokenStore.getState().watchToken(tradeData.mint);
      } else {
        // Remove from watched tokens
        useTokenStore.getState().unwatchToken(tradeData.mint);
      }
    }
  }

  private async evaluateCondition(condition: TriggerCondition, tradeData: any): Promise<boolean> {
    const value = this.getMetricValue(condition.metric, tradeData);
    
    // If no comparison or value is set, skip this condition
    if (!condition.comparison || condition.value === undefined) {
      console.log('⚠️ Skipping condition - missing comparison or value', condition);
      return false;
    }

    switch (condition.comparison) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '=': return value === condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      default: return false;
    }
  }

  private getMetricValue(metric: string, tradeData: any): number {
    switch (metric) {
      case 'volumeRate':
        return tradeData.volume || 0;
      case 'tradeFrequency':
        // You'll need to implement trade frequency calculation
        return 0;
      case 'priceChange':
        // Implement price change calculation
        return 0;
      // Add other metric calculations as needed
      default:
        return 0;
    }
  }

  queueTriggerEvaluation(group: TriggerGroup, tradeData: any) {
    this.evaluationQueue.push({group, data: tradeData});
    if (!this.processing) {
      this.processQueue();
    }
  }

  evaluateTrade(trade: TradeEvent) {
    console.log('🎯 ACTUALLY FUCKING HOOKED NOW:', trade.txType, trade.mint);
    
    // Clean old trades first
    this.cleanOldTrades(trade.mint);
    
    // Store this trade
    if (!this.tradeHistory.has(trade.mint)) {
      this.tradeHistory.set(trade.mint, []);
    }
    this.tradeHistory.get(trade.mint)!.push(trade);

    // Get metrics for this token
    const metrics = this.calculateMetrics(trade.mint);
    console.log(`📊 [TRIGGER] Token ${trade.mint} metrics:`, {
      buyCount: metrics.buyCount,
      totalVolume: metrics.totalVolume,
      avgTradeSize: metrics.avgTradeSize,
      consecutiveBuys: metrics.consecutiveBuys
    });

    // Check trigger conditions
    const conditions = [
      {
        name: 'Rapid Buy Sequence',
        result: metrics.consecutiveBuys >= 3,
        metrics: { consecutiveBuys: metrics.consecutiveBuys }
      },
      {
        name: 'High Volume',
        result: metrics.totalVolume > 100000,
        metrics: { volume: metrics.totalVolume }
      },
      {
        name: 'Large Trade Size',
        result: metrics.avgTradeSize > 10000,
        metrics: { avgSize: metrics.avgTradeSize }
      }
    ];

    // Log each condition check
    conditions.forEach(c => {
      console.log(`⚖️ [TRIGGER] Checking ${c.name}:`, {
        result: c.result,
        metrics: c.metrics
      });
    });

    // If any condition passes, add to watched list
    if (conditions.some(c => c.result)) {
      console.log(`🚨 [TRIGGER] Conditions met for ${trade.mint}! Adding to watched list...`);
      
      const tokenStore = useTokenStore.getState();
      const token = tokenStore.tokens.get(trade.mint);
      
      if (!token) {
        console.log('⚠️ [TRIGGER] Token not in store yet, waiting for next update:', trade.mint);
        return;
      }
      
      tokenStore.watchToken(trade.mint as any);
      
      const triggeredConditions = conditions
        .filter(c => c.result)
        .map((c: any) => c.name)
        .join(', ');
      
      console.log(`✨ Token ${trade.mint} added to watch list due to: ${triggeredConditions}`);
    }
  }

  private cleanOldTrades(mint: string) {
    const now = Date.now();
    const trades = this.tradeHistory.get(mint) || [];
    const recentTrades = trades.filter(t => (now - t.timestamp) <= this.TRADE_WINDOW);
    this.tradeHistory.set(mint, recentTrades);
  }

  private calculateMetrics(mint: string): TokenMetrics {
    const trades = this.tradeHistory.get(mint) || [];
    
    const buyTrades = trades.filter(t => t.txType === 'buy');
    let consecutiveBuys = 0;
    
    // Count consecutive buys from most recent
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].txType === 'buy') {
        consecutiveBuys++;
      } else {
        break;
      }
    }

    return {
      buyCount: buyTrades.length,
      totalVolume: trades.reduce((sum, t) => sum + t.tokenAmount, 0),
      avgTradeSize: trades.length ? trades.reduce((sum, t) => sum + t.tokenAmount, 0) / trades.length : 0,
      consecutiveBuys
    };
  }

  // private getCurrentConditions() {
  //   // TEMPORARY - Return test conditions to verify logic
  //   return [{
  //     field: 'txType',
  //     operator: '=',
  //     value: 'buy'
  //   }];
  // }

  // private evaluateConditions(trade: any, conditions: TriggerCondition[]) {
  //   console.log(`⚖️ Evaluating conditions for trade ${trade.signature}`, {
  //     tradeDetails: {
  //       price: trade.price,
  //       volume: trade.volume,
  //       type: trade.txType
  //     },
  //     conditions: conditions
  //   });
    
  //   // ... existing condition evaluation
  // }

  // private getTradeValueForCondition(trade: any, condition: TriggerCondition) {
  //   switch (condition.field) {
  //     case 'price':
  //       return trade.price;
  //     case 'volume':
  //       return trade.volume;
  //     case 'buyCount':
  //       return trade.txType === 'buy' ? 1 : 0;
  //     case 'sellCount':
  //       return trade.txType === 'sell' ? 1 : 0;
  //     default:
  //       console.error(`❌ [TriggerEvaluator] Unknown condition field: ${condition.field}`);
  //       return 0;
  //   }
  // }

  public getQueueLength(): number {
    return this.evaluationQueue.length;
  }

  public getProcessedCount(): number {
    return this.processedCount;
  }

  public getLastTriggerTime(): number | null {
    return this.lastTriggerTime;
  }
}

interface TokenMetrics {
  buyCount: number;
  totalVolume: number;
  avgTradeSize: number;
  consecutiveBuys: number;
}

interface TradeEvent {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: 'buy' | 'sell' | 'create';
  tokenAmount: number;
  timestamp: number;
}

export const triggerEvaluator = new TriggerEvaluator(); 