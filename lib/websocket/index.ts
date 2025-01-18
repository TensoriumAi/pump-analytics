import { useTokenStore } from '../store/useTokenStore';
import type { Token } from '../../types/token';

interface WSEvent {
  type: 'create' | 'update' | 'delete';
  data: Token;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks = new Set<(event: WSEvent) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private detailedLogging = false;

  constructor() {
    // Add default subscriber for token updates
    this.subscribe(async (event) => {
      const tokenStore = useTokenStore.getState();
      if (event.type === 'create' || event.type === 'update') {
        if (this.detailedLogging) {
          console.log('📨 Received token update:', event.data.mint);
        }
        await tokenStore.actions.updateToken(event.data);
      }
    });
  }

  async init() {
    try {
      console.log('🔌 Connecting to WebSocket...');
      
      const tokenStore = useTokenStore.getState();
      await tokenStore.actions.loadTokens();

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.detailedLogging) {
            console.log('📥 WebSocket message:', data);
          }
          this.notifySubscribers({
            type: data.txType,
            data: data
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('Failed to initialize:', error);
      this.attemptReconnect();
    }
  }

  private notifySubscribers(event: WSEvent) {
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in WebSocket subscriber:', error);
      }
    });
  }

  subscribe(callback: (event: WSEvent) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  setDetailedLogging(enabled: boolean) {
    this.detailedLogging = enabled;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.init();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  log(message: string) {
    if (this.detailedLogging) {
      console.log(message);
    }
  }
}

export const wsService = new WebSocketService();