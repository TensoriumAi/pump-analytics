"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { formatTimeAgo, cn } from "@/lib/utils";

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

export function DatabaseViewer() {
  const recentTokens = useLiveQuery(
    () => db.tokens
      .orderBy('createTime')
      .reverse()
      .limit(10)
      .toArray()
  );

  const recentTrades = useLiveQuery(
    async () => {
      const trades = await db.orders
        .orderBy('timestamp')
        .reverse()
        .limit(10)
        .toArray();

      // Get token info for each trade
      const tokenInfos = await Promise.all(
        trades.map((trade: any) => 
          db.tokens
            .where('mint')
            .equals(trade.tokenMint)
            .first()
        )
      );

      return trades.map((trade: any, i: number) => ({
        ...trade,
        tokenInfo: tokenInfos[i]
      }));
    }
  );

  return (
    <Tabs defaultValue="tokens" className="w-full">
      <TabsList>
        <TabsTrigger value="tokens">Recent Tokens</TabsTrigger>
        <TabsTrigger value="trades">Recent Trades</TabsTrigger>
      </TabsList>

      <TabsContent value="tokens">
        <Card>
          <CardHeader>
            <CardTitle>Last 10 Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTokens?.map((token: any) => (
                <div key={token.mint} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                  <div>
                    <div className="font-medium">{token.name}</div>
                    <div className="text-sm text-muted-foreground">{token.symbol}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTimeAgo(token.createTime)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trades">
        <Card>
          <CardHeader>
            <CardTitle>Last 10 Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTrades?.map((trade: any) => (
                <div key={trade.signature} className="p-3 bg-secondary rounded-lg">
                  {/* Header: Token Info & Time */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{trade.tokenInfo?.name || 'Unknown Token'}</div>
                      <div className="text-sm text-muted-foreground">{trade.tokenInfo?.symbol}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeAgo(trade.timestamp)}
                    </div>
                  </div>

                  {/* Trade Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className={cn(
                        "font-medium",
                        trade.type === 'buy' ? "text-green-500" : "text-red-500"
                      )}>
                        {trade.type.toUpperCase()}
                      </div>
                      <div className="text-muted-foreground">
                        {formatNumber(trade.tokenAmount)} tokens
                      </div>
                    </div>

                    <div className="text-right">
                      <div>{formatNumber(trade.volume)} SOL</div>
                      <div className="text-muted-foreground">
                        @ {formatPrice(trade.price)} SOL
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Market Cap</div>
                      <div>{formatNumber(trade.marketCapSol)} SOL</div>
                    </div>

                    <div className="text-right">
                      <div className="text-muted-foreground">LP Balance</div>
                      <div>{formatNumber(trade.vSolInBondingCurve)} SOL</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
} 