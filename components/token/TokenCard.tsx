"use client";

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from "../ui/card";
import { Token } from "../../types/token";
import { useTokenStore } from "../../lib/store/useTokenStore";
import { Star } from "lucide-react";
import { cn, formatTimeAgo, formatTokenPrice } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { TokenChart } from "./TokenChart";
import { TokenTimer } from './TokenTimer';
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { StarButton } from './StarButton';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';

interface TokenMetrics {
  priceChange: string;
  volumeRate: string;
  buyPercentage: string;
  volume: number;
  timeAgo: string;
  trajectories: {
    volume: number;
    frequency: number;
    price: number;
  };
}

interface Trade {
  id?: number;
  tokenMint: string;
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  volume: number;
  signature: string;
  traderPublicKey: string;
  trader: string;
  bondingCurveKey: string;
  marketCapSol: number;
  newTokenBalance: number;
  tokenAmount: number;
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  mintPrice?: number;
}

function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0.0';
  
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + 'k';
  }
  return num.toFixed(1);
}

function formatPrice(price: number): string {
  if (isNaN(price) || !isFinite(price)) return '0.000000';
  return price.toFixed(6);
}

function formatPercentage(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

function formatFullPrice(price: number): string {
  if (isNaN(price) || !isFinite(price)) return '0.0000000000000000';
  
  // Convert to string with fixed precision
  const fullPrice = price.toFixed(16);
  
  // Split into whole and decimal parts
  const [whole, decimal] = fullPrice.split('.');
  
  // Find first significant digit
  const firstNonZero = decimal.search(/[1-9]/);
  
  if (firstNonZero === -1) {
    return `${whole}.0`;
  }
  
  return `${whole}.`
    + `<span class="text-[0.7em] text-muted-foreground">0000000</span>`
    + decimal.slice(7); // Show remaining digits at normal size
}

function formatCompactPrice(price: number): string {
  if (!price || isNaN(price)) return '0.0000000000';
  return price.toFixed(11); // Show exactly 11 decimal places
}

interface TradeRecord {
  id?: number;
  tokenMint: string;
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  volume: number;
  signature: string;
  traderPublicKey: string;
  trader: string;
  bondingCurveKey: string;
  marketCapSol: number;
  newTokenBalance: number;
  tokenAmount: number;
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  mintPrice?: number;
  fillWidth?: string;
}

function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toFixed(3);
}

function TokenTrades({ mint }: { mint: string }) {
  const records = useLiveQuery(
    async () => {
      const trades = await db.orders
        .where('tokenMint')
        .equals(mint)
        .reverse()
        .toArray();

      // Find max volume for scaling
      const maxVolume = Math.max(...trades.map((t: any) => t.volume || 0));
      
      return trades.slice(0, 50).map((trade: any) => ({
        ...trade,
        fillWidth: `${((trade.volume || 0) / maxVolume) * 100}%`
      }));
    },
    [mint]
  );

  if (!records) return null;

  return (
    <div className="mt-2 space-y-1 text-xs font-mono relative">
      {/* Pipes layer */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {records?.map((record: TradeRecord, i: number) => {
          if (i === 0) return null;
          const prevRecord = records[i - 1];
          
          console.log('Checking trades:', {
            currentTrader: record.trader,
            previousTrader: prevRecord.trader,
            currentType: record.type,
            previousType: prevRecord.type,
            match: record.trader === prevRecord.trader
          });

          // Connect trades from same trader and same type
          const isConnected = 
            record.type === prevRecord.type && 
            record.trader === prevRecord.trader;
            
          if (!isConnected) return null;

          // Calculate y positions (adjusted for row height)
          const y1 = i * 24 + 12;
          const y2 = (i - 1) * 24 + 12;
          
          const color = record.type === 'buy' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
          
          return (
            <path
              key={`pipe-${i}`}
              d={`M 40 ${y1} Q 30 ${(y1 + y2) / 2} 40 ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity="0.3"
            />
          );
        })}
      </svg>

      {records?.map((record: TradeRecord, i: number) => (
        <Tooltip key={record.id || `${record.timestamp}-${i}`} delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex items-center h-5 relative w-full cursor-help">
              {/* Background fill */}
              <div 
                className={`absolute inset-0 ${
                  record.type === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
                style={{ width: record.fillWidth }}
              />
              
              {/* Content */}
              <div className="flex items-center w-full relative z-10">
                <span className={`w-[45px] ${
                  record.type === 'buy' ? 'text-green-500' : 
                  record.type === 'sell' ? 'text-red-500' : 
                  'text-blue-500'
                }`}>
                  {record.type?.toUpperCase()}
                </span>
                
                <span className="w-[120px] font-mono">
                  {record.price?.toFixed(11)}
                </span>
                
                <span className="w-[80px] text-right">
                  {formatTokenAmount(record.tokenAmount || 0)}
                </span>
                
                <span className="w-[90px] text-right">
                  {record.volume?.toFixed(3)} SOL
                </span>
                
                <span className="w-[70px] text-right text-muted-foreground">
                  {new Date(record.timestamp || Date.now())
                    .toLocaleTimeString(undefined, { 
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true 
                    })
                    .replace(/\s/g, '')
                  }
                </span>
                
                <span className="w-[35px] text-right text-muted-foreground">
                  {new Date(record.timestamp || Date.now())
                    .toLocaleTimeString(undefined, { 
                      second: '2-digit'
                    })
                    .replace(/\s/g, '')
                  }
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-mono text-xs">
            <div className="flex flex-col gap-1">
              <div>
                {record.type === 'buy' ? 'Buyer' : 'Seller'}: {record.traderPublicKey}
              </div>
              <div>
                Signature: {record.signature}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export const TokenCard = memo(function TokenCard({ token }: { token: Token }) {
  const isWatched = useTokenStore(state => state.watchedTokens.has(token.mint));
  const actions = useTokenStore(state => state.actions);
  const [flashState, setFlashState] = useState<'none' | 'buy' | 'sell'>('none');
  const lastTradeRef = useRef<Trade | null>(null);
  const [showTrades, setShowTrades] = useState(false);

  const handleWatchClick = () => {
    if (isWatched) {
      actions.unwatchToken(token.mint);
    } else {
      actions.watchToken(token.mint);
    }
  };

  const recentTrades = useLiveQuery(
    () => db.orders
      .where('tokenMint')
      .equals(token.mint)
      .reverse()
      .limit(100)
      .toArray(),
    [token.mint]
  );

  const metrics = useMemo(() => {
    if (!recentTrades?.length) {
      return {
        priceChange: "0.0%",
        volumeRate: "0.0/m",
        buyPercentage: "0.0%",
        volume: 0,
        timeAgo: "0s",
        price: token.lastPrice || 0,
        marketCap: token.marketCapSol || 0,
        lpBalance: token.vSolInBondingCurve || 0,
        mcapChange: 0,
        trajectory: '→'
      };
    }

    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const recentMinuteTrades = recentTrades.filter((t: any) => t.timestamp > oneMinAgo);
    
    const latestTrade = recentTrades[0];
    const previousTrade = recentTrades[1];
    
    const totalVolume = recentMinuteTrades.reduce((sum: number, t: any) => sum + t.volume, 0);
    const volumeRate = totalVolume / (recentMinuteTrades.length ? 1 : 60);
    
    const buyCount = recentMinuteTrades.filter((t: any) => t.type === 'buy').length;
    const buyPercentage = recentMinuteTrades.length > 0 
      ? (buyCount / recentMinuteTrades.length) * 100 
      : 0;

    const priceChange = previousTrade ? 
      ((latestTrade.price - previousTrade.price) / previousTrade.price) * 100 : 0;
    
    const mcapChange = previousTrade ? 
      ((latestTrade.marketCapSol - previousTrade.marketCapSol) / previousTrade.marketCapSol) * 100 : 0;

    return {
      priceChange: formatPercentage(priceChange),
      volumeRate: `${formatNumber(volumeRate)}/m`,
      buyPercentage: formatPercentage(buyPercentage),
      volume: totalVolume,
      timeAgo: formatTimeAgo(latestTrade.timestamp),
      price: latestTrade.price,
      marketCap: latestTrade.marketCapSol,
      lpBalance: latestTrade.vSolInBondingCurve,
      mcapChange,
      trajectory: formatTrajectory(calculateTrajectories(recentTrades))
    };
  }, [recentTrades]);

  // Query recent trades for this token
  const tradeCounts = useLiveQuery(async () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentTrades = await db.orders
      .where('tokenMint')
      .equals(token.mint)
      .and((trade: any) => trade.timestamp > oneDayAgo)
      .toArray();
    
    const buys = recentTrades.filter((t: any) => t.type === 'buy').length;
    const sells = recentTrades.filter((t: any) => t.type === 'sell').length;
    
    return { buys, sells, hasHistory: recentTrades.length > 0 };
  }, [token.mint], { buys: 0, sells: 0, hasHistory: false });

  const buyRatio = tradeCounts.buys + tradeCounts.sells > 0 
    ? (tradeCounts.buys / (tradeCounts.buys + tradeCounts.sells) * 100).toFixed(0)
    : '0';

  // Watch for new trades
  useEffect(() => {
    if (!recentTrades?.length) return;
    
    const latestTrade = recentTrades[0] as any;
    if (!lastTradeRef.current) {
      lastTradeRef.current = latestTrade;
      return;
    }

    if (latestTrade.timestamp !== lastTradeRef.current.timestamp) {
      // New trade detected
      setFlashState(latestTrade.type === 'buy' ? 'buy' : 'sell');
      lastTradeRef.current = latestTrade;
      
      // Reset flash after animation
      setTimeout(() => {
        setFlashState('none');
      }, 1000);
    }
  }, [recentTrades]);

  return (
    <Card className={cn(
      "w-[400px] border-l-4",
      flashState === 'buy' && "flash-buy",
      flashState === 'sell' && "flash-sell",
      !tradeCounts.hasHistory ? "border-l-blue-500" : 
      isWatched ? "border-l-green-500" : 
      "border-l-red-500"
    )}>
      <CardContent className="p-2">
        {/* Top Row: Name and Star */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarButton token={token} />
              <a 
                href={`https://www.dextools.io/app/en/solana/pair-explorer/${token.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
              >
                {token.name}
              </a>
            </div>
            <span className="text-xs text-muted-foreground">
              <a 
                href={`https://pump.fun/token/${token.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline"
              >
                {token.symbol}
              </a>
            </span>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-x-4 mb-1">
          {/* Left Column */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">MCap:</span>
              <div className="flex items-center gap-1">
                <span>{formatNumber(metrics.marketCap)} SOL</span>
                {metrics.mcapChange !== 0 && (
                  <span className={cn(
                    "text-xs",
                    metrics.mcapChange > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {metrics.mcapChange > 0 ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">LP:</span>
              <span>{formatNumber(metrics.lpBalance)} SOL</span>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Vol:</span>
              <span>{formatNumber(metrics.volume)} SOL</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Price:</span>
              <span className="font-mono text-xs whitespace-nowrap">
                {formatCompactPrice(token.lastPrice)}
              </span>
              <span className="text-xs text-muted-foreground">SOL</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Time and Rate */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Rate: {metrics.volumeRate}</span>
          <TokenTimer 
            timestamp={recentTrades?.[0]?.timestamp || Date.now()} 
            className="text-gray-400"
          />
        </div>

        {/* Chart */}
        <TokenChart mint={token.mint} />

        {/* Add trade counts */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-xs cursor-help">
              <span className={cn(
                "font-mono",
                !tradeCounts.hasHistory ? "text-blue-500" : "text-green-500"
              )}>
                {tradeCounts.buys}
              </span>
              <span>/</span>
              <span className="text-red-500 font-mono">
                {tradeCounts.sells}
              </span>
              <span className="text-muted-foreground">
                ({buyRatio}% buys)
                {!tradeCounts.hasHistory && " • New Token"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {tradeCounts.buys} buys, {tradeCounts.sells} sells in 24h
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="flex justify-end mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowTrades(!showTrades)}
          >
            {showTrades ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {showTrades && <TokenTrades mint={token.mint} />}
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  // Only re-render if these props change
  return prev.token.mint === next.token.mint &&
         prev.token.lastUpdate === next.token.lastUpdate;
});
// Helper functions
interface TrajectoryMetrics {
  volume: number;
  frequency: number;
  price: number;
  marketCap: number;
  liquidity: number;
}

function calculateTrajectories(trades: any[]): TrajectoryMetrics {
  const TRAJECTORY_WINDOW = 60000; // 1 minute window
  const now = Date.now();
  
  // Filter to window
  const windowTrades = trades.filter(t => now - t.timestamp < TRAJECTORY_WINDOW);
  
  if (windowTrades.length < 2) {
    return { 
      volume: 0, 
      frequency: 0, 
      price: 0, 
      marketCap: 0, 
      liquidity: 0 
    };
  }
  
  const timeSpanMinutes = (now - windowTrades[0].timestamp) / 60000;
  
  // Volume trajectory (in SOL)
  const volumeChange = windowTrades.reduce((sum, t) => sum + t.volume, 0);
  const volumeTrajectory = volumeChange / timeSpanMinutes;
  
  // Trade frequency
  const tradeFrequency = windowTrades.length / timeSpanMinutes;
  
  // Price and market metrics
  const latest = windowTrades[0];
  const earliest = windowTrades[windowTrades.length-1];
  
  const priceChange = ((latest.price - earliest.price) / earliest.price) * 100;
  const marketCapChange = ((latest.marketCapSol - earliest.marketCapSol) / earliest.marketCapSol) * 100;
  const liquidityChange = ((latest.vSolInBondingCurve - earliest.vSolInBondingCurve) / earliest.vSolInBondingCurve) * 100;
  
  return {
    volume: volumeTrajectory,
    frequency: tradeFrequency,
    price: priceChange,
    marketCap: marketCapChange,
    liquidity: liquidityChange
  };
}

function formatTrajectory(trajectories: TrajectoryMetrics): string {
  const indicators = [];
  
  // Volume indicator
  if (Math.abs(trajectories.volume) > 0.01) {
    const arrow = trajectories.volume > 0 ? '↗' : '↘';
    indicators.push(`${arrow}${formatNumber(Math.abs(trajectories.volume))}s`);
  }
  
  // Trade frequency
  if (trajectories.frequency > 0.1) {
    indicators.push(`⚡${trajectories.frequency.toFixed(1)}/m`);
  }
  
  // Price change
  if (Math.abs(trajectories.price) > 0.1) {
    const arrow = trajectories.price > 0 ? '📈' : '📉';
    indicators.push(`${arrow}${Math.abs(trajectories.price).toFixed(1)}%`);
  }
  
  // Market cap change
  if (Math.abs(trajectories.marketCap) > 1) {
    const arrow = trajectories.marketCap > 0 ? '🚀' : '📉';
    indicators.push(`${arrow}${Math.abs(trajectories.marketCap).toFixed(1)}%`);
  }
  
  // Liquidity change
  if (Math.abs(trajectories.liquidity) > 1) {
    const arrow = trajectories.liquidity > 0 ? '💧' : '🔥';
    indicators.push(`${arrow}${Math.abs(trajectories.liquidity).toFixed(1)}%`);
  }
  
  return indicators.length > 0 ? indicators.join(' ') : '→';
}
