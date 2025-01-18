export type WatchStatus = 'unwatched' | 'watched' | 'triggered';

export interface TokenMetrics {
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  trades24h: number;
  lastTradeTime: number;
  marketCap: number;
  lpBalance: number;
  tokenSupply: number;
  volumeRate: number;
  tradeFrequency: number;
  price: number;
}

export interface TokenWithMetrics extends Token {
  metrics: TokenMetrics;
}

export interface Token {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: 'create';
  initialBuy: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  name: string;
  symbol: string;
  uri: string;
  watchStatus: 'watched' | 'unwatched';
  createTime: number;
  lastUpdate: number;
  lastPrice: number;
  lastTradeTime: number;
  mintPrice: number;
  metrics?: TokenMetrics;
}

export interface AutoWatchConfig {
  minInitialLPSol: number;
  maxMcapLPRatio: number;
  minTradesFirst2Min: number;
  minVolumePerMin: number;
  minBuySellRatio: number;
  volumeDropThreshold: number;
  maxInactiveSeconds: number;
  priceDropThreshold: number;
  walletConcentrationLimit: number;
}

export interface TokenWatchMetrics {
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
  walletConcentration: Map<string, number>;
  lastPrice?: number;
} 