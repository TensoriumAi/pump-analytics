"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { Button } from "../ui/button";

export function TokenChart({ mint }: { mint: string }) {
  const [timeWindow, setTimeWindow] = useState<'1m' | '5m' | '15m' | '1h'>('5m');

  const trades = useLiveQuery(async () => {
    const now = Date.now();
    const windowMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000
    }[timeWindow];

    return db.orders
      .where('tokenMint')
      .equals(mint)
      .and((trade: any) => trade.timestamp > now - windowMs)
      .toArray();
  }, [mint, timeWindow]);

  if (!trades?.length) {
    return (
      <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
        No trade data
      </div>
    );
  }

  // Process trades into bars showing price movement
  const processedData = trades
    .sort((a: any, b: any) => a.timestamp - b.timestamp)
    .map((trade: any, index: number, arr: any[]) => {
      const prevTrade = arr[index - 1];
      const priceChange = prevTrade ? 
        ((trade.price - prevTrade.price) / prevTrade.price) * 100 : 
        0;
      
      return {
        time: trade.timestamp,
        volume: trade.volume,
        priceChange: priceChange,
        isPositive: priceChange >= 0,
        price: trade.price
      };
    });

  return (
    <div className="mt-2">
      <div className="flex gap-1 justify-end mb-1">
        {(['1m', '5m', '15m', '1h'] as const).map(window => (
          <Button
            key={window}
            variant={timeWindow === window ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => setTimeWindow(window)}
          >
            {window}
          </Button>
        ))}
      </div>

      <div className="h-[50px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} barGap={0}>
            {/* Price change bars */}
            <Bar
              dataKey="price"
              fill="#22c55e"
              shape={(props: any) => {
                const { x, y, width, height, fill } = props;
                const data = props.payload;
                const color = data.isPositive ? "#22c55e" : "#ef4444";
                const barHeight = Math.max(1, Math.abs(height));
                const yPos = data.isPositive ? y : y - barHeight;
                
                return (
                  <rect
                    x={x}
                    y={yPos}
                    width={Math.max(0.5, width - 1)}
                    height={barHeight}
                    fill={color}
                    opacity={0.8}
                  />
                );
              }}
            />
            {/* Volume bars underneath */}
            <Bar
              dataKey="volume"
              fill="#22c55e"
              opacity={0.2}
              maxBarSize={2}
            />
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white/90 border rounded-md shadow-sm p-1 text-xs">
                    <div>Price: {data.price.toFixed(6)} SOL</div>
                    <div>Change: {data.priceChange.toFixed(2)}%</div>
                    <div>Volume: {data.volume.toFixed(2)} SOL</div>
                    <div>{new Date(data.time).toLocaleTimeString()}</div>
                  </div>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 