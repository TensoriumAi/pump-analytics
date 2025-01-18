import Dexie, { Transaction } from 'dexie';
import { Token } from '@/types/token';

interface Trade {
  id?: number;
  tokenMint: string;
  timestamp: number;
  type: 'buy' | 'sell' | 'mint';
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

interface WatchMetrics {
  mint: string;
  createTime: number;
  watchStartTime: number;
  peakVolume: number;
  peakPrice: number;
  volumeVelocity: number[];
  tradeFrequency: number[];
  buyWallStrength: number;
  lastTradeTime: number;
  manipulationScore: number;
  walletConcentration: string; // Serialized Map<string, number>
  lastPrice?: number;
  lastUpdate: number;
}

class TokenDatabase extends Dexie {
  tokens!: Dexie.Table<Token>;
  orders!: Dexie.Table<Trade>;
  subscriptions!: Dexie.Table<any>;
  settings!: Dexie.Table<any>;
  watchMetrics!: Dexie.Table<WatchMetrics>;

  constructor() {
    super('TokenDB');
    this.version(4).stores({
      tokens: 'mint,symbol,watchStatus,createTime,lastUpdate,lastTradeTime',
      orders: '++id,tokenMint,timestamp,type,trader',
      subscriptions: 'mint,subscribeTime,status',
      watchMetrics: 'mint'
    });
  }
}

export const db = new TokenDatabase();

// Helper function to calculate mint price
export function calculateMintPrice(vSolInBondingCurve: number, vTokensInBondingCurve: number): number {
  return vTokensInBondingCurve > 0 ? vSolInBondingCurve / vTokensInBondingCurve : 0;
}

// Export a function to check database status
export async function isDatabaseReady() {
  try {
    await db.open();
    return true;
  } catch (error) {
    console.error('Failed to open database:', error);
    return false;
  }
}