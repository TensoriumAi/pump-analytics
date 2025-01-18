"use client";

import { Token, TokenMetrics } from "@/types/token";
import { db } from "./db";

type WebSocketEvent = {
  type: 'create' | 'tokenTrade' | 'accountTrade';
  data: {
    mint: string;
    [key: string]: any;
  };
};

type WebSocketCallback = (event: WebSocketEvent) => void;

type SubscriptionPayload = {
  method: 'subscribeNewToken' | 'subscribeTokenTrade' | 'subscribeAccountTrade' |
         'unsubscribeNewToken' | 'unsubscribeTokenTrade' | 'unsubscribeAccountTrade';
  keys?: string[];
};

interface QueuedSubscription {
  mint: string;
  action: 'subscribe' | 'unsubscribe';
  timestamp: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: Set<WebSocketCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private pendingSubscriptions: Set<SubscriptionPayload> = new Set();
  private isConnecting = false;
  private subscriptionQueue: QueuedSubscription[] = [];
  private processingQueue = false;
  private queueProcessInterval = 1000; // Process queue every second
  private queueTimer: NodeJS.Timeout | null = null;
  private activeSubscriptions: Set<string> = new Set();
  private autoResubscribe = false;
  private detailedLogging: boolean = false;
  private manuallyDisconnected: boolean = false;

  constructor(private url: string = 'wss://pumpportal.fun/api/data') {
    this.startQueueProcessor();
  }

  private startQueueProcessor() {
    this.queueTimer = setInterval(() => {
      if (this.subscriptionQueue.length > 0) {
        this.processSubscriptionQueue();
      }
    }, 2000); // Process every 2 seconds instead of 1
  }

  private async processSubscriptionQueue() {
    if (this.processingQueue || this.subscriptionQueue.length === 0) {
      return;
    }

    try {
      this.processingQueue = true;
      this.log('🔄 Processing subscription queue:', this.subscriptionQueue.length);

      // Group by action type and filter duplicates
      const subscribes = [...new Set(
        this.subscriptionQueue
          .filter(q => q.action === 'subscribe')
          .filter(q => !this.activeSubscriptions.has(q.mint))
          .map(q => q.mint)
      )];
      
      const unsubscribes = [...new Set(
        this.subscriptionQueue
          .filter(q => q.action === 'unsubscribe')
          .filter(q => this.activeSubscriptions.has(q.mint))
          .map(q => q.mint)
      )];

      // Send batch subscriptions
      if (subscribes.length > 0) {
        this.send({
          method: "subscribeTokenTrade",
          keys: subscribes
        });
        // Update active subscriptions
        subscribes.forEach(mint => this.activeSubscriptions.add(mint));
        this.log('📡 Batch subscribed tokens:', subscribes);
      }

      // Send batch unsubscriptions
      if (unsubscribes.length > 0) {
        this.send({
          method: "unsubscribeTokenTrade",
          keys: unsubscribes
        });
        // Update active subscriptions
        unsubscribes.forEach(mint => this.activeSubscriptions.delete(mint));
        this.log('🔕 Batch unsubscribed tokens:', unsubscribes);
      }

      // Clear processed items
      this.subscriptionQueue = [];

    } catch (error) {
      this.log('❌ Error processing subscription queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  connect() {
    this.manuallyDisconnected = false;
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      this.log('🔄 WebSocket already connected or connecting');
      return;
    }
    
    try {
      this.isConnecting = true;
      this.log('🔌 Connecting to WebSocket...', null, true);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.log('✅ WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Only subscribe to new token events
        const payload = {
          method: "subscribeNewToken"
        };
        this.log('🔔 Subscribing to new token events:', payload);
        this.send(payload as SubscriptionPayload);
        
        // Don't auto-restore subscriptions
        this.log('⏸ Auto-resubscribe disabled, skipping restore');
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          this.log('📥 Raw WebSocket message:', data, false);

          // Handle token creation events
          if (data.txType === 'create') {
            await this.handleNewToken(data);
          }
          
          // Handle trade events
          else if (data.txType === 'buy' || data.txType === 'sell') {
            this.log('🔄 Processing trade event:', data);
            await this.handleTrade(data);
          }

          // Notify subscribers
          this.callbacks.forEach(callback => callback({
            type: data.txType,
            data: data
          }));
        } catch (error) {
          this.log('❌ Error processing message:', error, true);
          console.error('Raw message:', event.data);
        }
      };

      this.ws.onclose = () => {
        this.log('WebSocket closed');
        this.isConnecting = false;
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        this.log('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      this.log('❌ WebSocket connection error:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.manuallyDisconnected) {
      this.log('🛑 Skipping reconnect - manually disconnected');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectTimeout * Math.pow(2, this.reconnectAttempts));
  }

  private send(payload: SubscriptionPayload) {
    this.log('📤 Sending WebSocket payload:', payload);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      this.log('✅ Payload sent successfully');
    } else {
      this.log('⏳ Connection not ready, queueing payload');
      this.pendingSubscriptions.add(payload);
      if (!this.isConnecting) {
        this.log('🔄 Initiating connection for queued payload');
        this.connect();
      }
    }
  }

  watchToken(mint: string) {
    this.send({
      method: "subscribeTokenTrade",
      keys: [mint]
    });
  }

  unwatchToken(mint: string) {
    this.send({
      method: "unsubscribeTokenTrade",
      keys: [mint]
    });
  }

  subscribe(callback: WebSocketCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  disconnect() {
    this.log('🔌 Manually disconnecting WebSocket');
    this.manuallyDisconnected = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.activeSubscriptions.clear();
    this.subscriptionQueue = [];
    this.isConnecting = false;
  }

  async subscribeToToken(mint: string) {
    try {
      this.log('🔔 Queueing subscription for:', mint);
      
      // Add to database
      await db.subscriptions.put({
        mint,
        subscribeTime: Date.now(),
        status: 'active'
      });

      // Add to queue instead of sending immediately
      this.subscriptionQueue.push({
        mint,
        action: 'subscribe',
        timestamp: Date.now()
      });

    } catch (error) {
      this.log('❌ Error queueing subscription:', error);
    }
  }

  async unsubscribeFromToken(mint: string) {
    try {
      this.log('🔕 Queueing unsubscribe for:', mint);
      
      await db.subscriptions.put({
        mint,
        subscribeTime: Date.now(),
        status: 'inactive'
      });

      this.subscriptionQueue.push({
        mint,
        action: 'unsubscribe',
        timestamp: Date.now()
      });

    } catch (error) {
      this.log('❌ Error queueing unsubscribe:', error);
    }
  }

  private async handleNewToken(tokenData: Token) {
    try {
      this.log(`🆕 New token created: ${tokenData.symbol} (${tokenData.mint})`, null, false);
      
      // Batch database operations into a single transaction
      await db.transaction('rw', [db.tokens, db.subscriptions], async () => {
        // Check if token exists first
        const exists = await db.tokens.get(tokenData.mint);
        if (exists) return;

        // Prepare and store token
        const token = {
          mint: tokenData.mint,
          symbol: tokenData.symbol,
          name: tokenData.name,
          watchStatus: 'unwatched',
          createTime: Date.now(),
          lastUpdate: Date.now()
        };

        await Promise.all([
          db.tokens.add(token as Token),
          db.subscriptions.put({
            mint: tokenData.mint,
            subscribeTime: Date.now(),
            status: 'active'
          })
        ]);

        // Queue subscription for the new token
        this.subscriptionQueue.push({
          mint: tokenData.mint,
          action: 'subscribe',
          timestamp: Date.now()
        });

        // Notify subscribers after successful DB write
        this.callbacks.forEach(callback => callback({
          type: 'create',
          data: token
        }));
      });

    } catch (error) {
      this.log('❌ Error handling new token:', error, true);
    }
  }

  private async restoreSubscriptions() {
    if (!this.autoResubscribe) {
      this.log('⏸ Auto-resubscribe disabled, skipping restore');
      return;
    }
    try {
      const activeSubscriptions = await db.subscriptions
        .where('status')
        .equals('active')
        .toArray();

      if (activeSubscriptions.length > 0) {
        const mints = activeSubscriptions.map((s: any) => s.mint);
        this.log('📋 Restoring subscriptions for tokens:', mints);
        
        // Update active subscriptions set
        mints.forEach((mint: string) => this.activeSubscriptions.add(mint));
        
        this.send({
          method: "subscribeTokenTrade",
          keys: mints
        });
      }
    } catch (error) {
      this.log('❌ Error restoring subscriptions:', error);
    }
  }

  async setAutoResubscribe(enabled: boolean) {
    this.autoResubscribe = enabled;
    await db.settings.put({
      id: 'app',
      autoResubscribe: enabled
    });
    
    this.log(`${enabled ? '🔄' : '⏸'} Auto-resubscribe ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      // Clear active subscriptions but keep database records
      this.activeSubscriptions.clear();
      this.subscriptionQueue = [];
    } else {
      // Restore subscriptions if enabled
      await this.restoreSubscriptions();
    }
  }

  private async handleTrade(tradeData: any) {
    try {
      const token = await db.tokens.get(tradeData.mint);
      if (!token) {
        this.log('⚠️ Skipping trade - No associated token found:', tradeData.mint);
        return;
      }

      // Calculate metrics
      const price = tradeData.vSolInBondingCurve / tradeData.vTokensInBondingCurve;
      const volume = tradeData.tokenAmount * price;

      const trade = {
        tokenMint: tradeData.mint,
        timestamp: Date.now(),
        type: tradeData.txType as 'buy' | 'sell',
        price,
        volume,
        signature: tradeData.signature,
        traderPublicKey: tradeData.traderPublicKey,
        trader: tradeData.traderPublicKey,
        bondingCurveKey: tradeData.bondingCurveKey,
        marketCapSol: tradeData.vSolInBondingCurve,
        newTokenBalance: tradeData.newTokenBalance,
        tokenAmount: tradeData.tokenAmount,
        vSolInBondingCurve: tradeData.vSolInBondingCurve,
        vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
      };

      // Save trade and update token in a single transaction
      await db.transaction('rw', [db.orders, db.tokens], async () => {
        await db.orders.add(trade);
        
        // Calculate 24h metrics
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const trades24h = await db.orders
          .where('tokenMint')
          .equals(trade.tokenMint)
          .and((t: any) => t.timestamp > dayAgo)
          .toArray();

        const metrics: TokenMetrics = {
          lastPrice: price,
          priceChange24h: trades24h.length > 1 ? 
            ((price - trades24h[0].price) / trades24h[0].price) * 100 : 0,
          volume24h: trades24h.reduce((sum: number, t: any) => sum + t.volume, 0),
          trades24h: trades24h.length,
          lastTradeTime: trade.timestamp,
          marketCap: trade.marketCapSol,
          lpBalance: trade.vSolInBondingCurve,
          tokenSupply: trade.vTokensInBondingCurve,
          volumeRate: volume,
          tradeFrequency: trades24h.length / 24,
          price
        };

        // Update token with metrics
        await db.tokens.where('mint').equals(trade.tokenMint).modify((token: any) => {
          token.lastPrice = price;
          token.lastTradeTime = trade.timestamp;
          token.lastUpdate = Date.now();
          token.vSolInBondingCurve = trade.vSolInBondingCurve;
          token.vTokensInBondingCurve = trade.vTokensInBondingCurve;
          token.mintPrice = price;
          token.metrics = metrics;
        });
      });

    } catch (error) {
      this.log('❌ Error handling trade:', error, true);
      console.error('Failed trade data:', tradeData);
    }
  }

  setDetailedLogging(enabled: boolean) {
    this.detailedLogging = enabled;
    console.log(`${enabled ? '🔍' : '🔸'} Detailed logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  public log(message: string, data?: any, force: boolean = false) {
    if (this.detailedLogging || force) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
}

export const wsService = new WebSocketService();