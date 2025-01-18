export type TriggerOperator = 'AND' | 'OR';
export type TriggerComparison = '>' | '<' | '=' | '>=' | '<=';

export interface TriggerCondition {
  id: string;
  metric: 'volumeRate' | 'tradeFrequency' | 'priceChange' | 'totalVolume' | 
         'volumeDecline' | 'inactiveTime' | 'priceDrop' | 'buyPercentage' |
         'wildcardSearch' | 'llmPrompt' | 'buyCount';
  comparison?: TriggerComparison;
  value?: number;
  pattern?: string;  // For wildcard search
  prompt?: string;   // For LLM prompt
  unit: string;
}

export interface TriggerGroup {
  id: string;
  name: string;
  enabled: boolean;
  type: 'watch' | 'unwatch';
  operator: TriggerOperator;
  conditions: TriggerCondition[];
}

export interface Trigger {
  id: string;
  name: string;
  enabled: boolean;
  groups: TriggerGroup[];
  action: {
    type: 'notification' | 'webhook' | 'sound';
    config: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}
