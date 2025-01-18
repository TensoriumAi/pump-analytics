import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils';
import { useSol2Usd } from '@/lib/services/sol2usd';

interface TokenMetricsProps {
  mint: string;
}

const calculateDayVolume = (trades: any[] | undefined) => {
  if (!trades) return 0;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const filteredTrades = trades.filter(trade => trade.timestamp > dayAgo);
  
  console.log('📊 Raw trade data:', trades.map(t => ({
    price: t.price,
    volume: t.volume,
    total: t.volume,
    time: new Date(t.timestamp)
  })));
  
  const volume = filteredTrades.reduce((sum, trade) => sum + trade.volume, 0);
  
  console.log('📈 Volume summary:', {
    totalTrades: trades.length,
    filteredTrades: filteredTrades.length,
    dayAgo: new Date(dayAgo),
    volume
  });
  
  return volume;
};

export function TokenMetrics({ mint }: TokenMetricsProps) {
  const [flashState, setFlashState] = useState<'buy' | 'sell' | null>(null);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [usdVolume, setUsdVolume] = useState<number | null>(null);
  const sol2usd = useSol2Usd();
  
  const recentTrades = useLiveQuery(
    () => db.orders
      .where('tokenMint')
      .equals(mint)
      .reverse()
      .limit(100)
      .toArray(),
    [mint]
  );

  // Flash animation when new trades come in
  useEffect(() => {
    if (recentTrades?.[0]?.type) {
      setFlashState(recentTrades[0].type as 'buy' | 'sell');
      const timer = setTimeout(() => setFlashState(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [recentTrades]);

  useEffect(() => {
    console.log('🔄 TokenMetrics trades update:', {
      mint,
      tradesCount: recentTrades?.length,
      latestTrade: recentTrades?.[0],
      previousTrade: recentTrades?.[1]
    });
  }, [recentTrades, mint]);

  // Calculate current price based on market cap and supply
  const getCurrentPrice = (trade: any) => {
    if (!trade?.marketCapSol || !trade?.newTokenBalance) return 0;
    return trade.marketCapSol / trade.newTokenBalance;
  };

  const latestTrade = recentTrades?.[0];
  const currentPrice = getCurrentPrice(latestTrade);
  const previousPrice = getCurrentPrice(recentTrades?.[1]);

  const priceChange = currentPrice && previousPrice
    ? ((currentPrice - previousPrice) / previousPrice) * 100
    : 0;

  return (
    <div className={cn(
      "grid gap-2 animate-in fade-in duration-200 rounded-lg p-3 transition-colors",
      flashState === 'buy' && "bg-green-500/10",
      flashState === 'sell' && "bg-red-500/10"
    )}>
      <div className="flex justify-between">
        <span>Price</span>
        <div className="text-right">
          <div className={cn(
            "font-mono transition-colors",
            priceChange > 0 ? "text-green-500" : 
            priceChange < 0 ? "text-red-500" : ""
          )}>
            {currentPrice.toFixed(8)} SOL
            {usdPrice && <span className="text-xs ml-1">(${usdPrice.toFixed(2)})</span>}
          </div>
          {priceChange !== 0 && (
            <span className={cn(
              "text-xs",
              flashState === 'buy' && "animate-pulse",
              flashState === 'sell' && "animate-pulse"
            )}>
              ({priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%)
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between">
        <span>Market Cap</span>
        <div className="text-right font-mono">
          {latestTrade?.marketCapSol.toFixed(2)} SOL
        </div>
      </div>
      <div className="flex justify-between">
        <span>24h Volume</span>
        <div className="text-right font-mono">
          <div>{calculateDayVolume(recentTrades)?.toFixed(2)} SOL</div>
          {usdVolume && <div className="text-xs text-muted-foreground">${usdVolume.toFixed(2)}</div>}
        </div>
      </div>
      <div className="flex justify-between">
        <span>Last Trade</span>
        <span className={cn(
          "font-mono",
          latestTrade?.type === 'buy' ? "text-green-500" : "text-red-500"
        )}>
          {latestTrade?.timestamp ? formatTimeAgo(latestTrade.timestamp) : 'N/A'}
        </span>
      </div>
    </div>
  );
} 