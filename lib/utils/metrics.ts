import { db } from '../db';
import { TokenMetrics, Token } from '@/types/token';

export async function calculateTokenMetrics(
  mint: string, 
  trades: any[], 
  token: Token
): Promise<TokenMetrics> {
  const lastTrade = trades[0];
  const currentPrice = lastTrade?.price || 0;
  
  // Calculate market cap and token supply
  const marketCap = token.marketCapSol || 0;
  const tokenSupply = token.vTokensInBondingCurve || 0;
  
  // Calculate 24h volume and get first trade
  const volume24h = trades.reduce((sum, trade) => sum + trade.volume, 0);
  const firstTrade = trades[trades.length - 1];
  
  // Calculate volume rate (volume per minute)
  const timeSpan = lastTrade && firstTrade ? 
    (lastTrade.timestamp - firstTrade.timestamp) / (1000 * 60) : 1;
  const volumeRate = volume24h / Math.max(timeSpan, 1);
  
  // Calculate trade frequency (trades per minute)
  const tradeFrequency = trades.length / Math.max(timeSpan, 1);

  // Get LP balance from token data
  const lpBalance = token.vSolInBondingCurve || 0;
  
  return {
    lastPrice: currentPrice,
    marketCap,
    tokenSupply,
    priceChange24h: firstTrade ? ((currentPrice - firstTrade.price) / firstTrade.price * 100) : 0,
    volume24h,
    trades24h: trades.length,
    lastTradeTime: lastTrade?.timestamp || 0,
    lpBalance,
    volumeRate,
    tradeFrequency,
    price: currentPrice  // Add price field which is same as lastPrice
  };
}

export function calculateTrajectories(trades: any[]) {
  if (!trades || trades.length < 2) {
    return {
      price: "0%",
      volume: "0/m",
      conversion: "0%"
    };
  }

  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const recentTrades = trades.filter(t => t.timestamp > oneMinuteAgo);

  // Calculate price trajectory
  const latestPrice = trades[0].price;
  const earliestPrice = trades[trades.length - 1].price;
  const priceChange = ((latestPrice - earliestPrice) / earliestPrice) * 100;

  // Calculate volume per minute
  const volumePerMinute = recentTrades.reduce((sum, t) => sum + t.volume, 0);

  // Calculate conversion rate (buys vs sells)
  const buys = recentTrades.filter(t => t.type === 'buy').length;
  const total = recentTrades.length;
  const conversionRate = (buys / total) * 100;

  return {
    price: `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
    volume: `${volumePerMinute.toFixed(1)}/m`,
    conversion: `${conversionRate > 0 ? '+' : ''}${conversionRate.toFixed(1)}%`
  };
}

interface TradeMetrics {
  volumeVelocity: number;  // SOL/minute
  priceChange: number;     // Percentage
  buyPercentage: number;   // Percentage
  trajectories: {
    price: number;
    volume: number;
  };
}

export function calculateTradeMetrics(trades: any[], timeWindowMs = 60000): TradeMetrics {
  if (!trades?.length) {
    return {
      volumeVelocity: 0,
      priceChange: 0,
      buyPercentage: 0,
      trajectories: { price: 0, volume: 0 }
    };
  }

  const now = Date.now();
  const windowStart = now - timeWindowMs;
  
  // Recent trades within time window
  const recentTrades = trades.filter(t => t.timestamp >= windowStart);
  
  // Volume velocity (SOL/minute)
  const recentVolume = recentTrades.reduce((sum, t) => sum + t.volume, 0);
  const volumeVelocity = (recentVolume / timeWindowMs) * 60000;

  // Price change
  const latestPrice = trades[0]?.price || 0;
  const oldestPrice = trades[trades.length - 1]?.price || latestPrice;
  const priceChange = oldestPrice ? ((latestPrice - oldestPrice) / oldestPrice) * 100 : 0;

  // Buy percentage
  const buyCount = recentTrades.filter(t => t.type === 'buy').length;
  const buyPercentage = recentTrades.length ? (buyCount / recentTrades.length) * 100 : 0;

  // Trajectories (rate of change)
  const midPoint = Math.floor(recentTrades.length / 2);
  const recentHalf = recentTrades.slice(0, midPoint);
  const olderHalf = recentTrades.slice(midPoint);
  
  const recentVol = recentHalf.reduce((sum, t) => sum + t.volume, 0);
  const olderVol = olderHalf.reduce((sum, t) => sum + t.volume, 0);
  const volumeTrajectory = olderVol ? ((recentVol - olderVol) / olderVol) * 100 : 0;

  const recentAvgPrice = recentHalf.reduce((sum, t) => sum + t.price, 0) / recentHalf.length;
  const olderAvgPrice = olderHalf.reduce((sum, t) => sum + t.price, 0) / olderHalf.length;
  const priceTrajectory = olderAvgPrice ? ((recentAvgPrice - olderAvgPrice) / olderAvgPrice) * 100 : 0;

  return {
    volumeVelocity,
    priceChange,
    buyPercentage,
    trajectories: {
      price: priceTrajectory,
      volume: volumeTrajectory
    }
  };
} 