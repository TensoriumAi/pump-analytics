import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TriggerOperator = 'AND' | 'OR';
export type TriggerComparison = '>' | '<' | '=' | '>=' | '<=';

export type TriggerCondition = {
  id: string;
  metric: 'volumeRate' | 'tradeFrequency' | 'priceChange' | 'totalVolume' | 
         'volumeDecline' | 'inactiveTime' | 'priceDrop' | 'buyPercentage' |
         'wildcardSearch' | 'llmPrompt' | 'buyCount';
  comparison?: TriggerComparison;
  value?: number;
  pattern?: string;  // For wildcard search
  prompt?: string;   // For LLM prompt
  unit: string;
};

export interface TriggerGroup {
  id: string;
  name: string;
  enabled: boolean;
  type: 'watch' | 'unwatch';
  operator: TriggerOperator;
  conditions: TriggerCondition[];
}

interface TriggerState {
  triggerGroups: TriggerGroup[];
  addGroup: (group: Omit<TriggerGroup, 'id'>) => void;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<TriggerGroup>) => void;
  addCondition: (groupId: string, condition: Omit<TriggerCondition, 'id'>) => void;
  removeCondition: (groupId: string, conditionId: string) => void;
  updateCondition: (groupId: string, conditionId: string, updates: Partial<TriggerCondition>) => void;
}

const useTriggerStore = create<TriggerState>()(
  persist(
    (set) => ({
      triggerGroups: [],
      
      addGroup: (group) => set((state) => ({
        triggerGroups: [...state.triggerGroups, { ...group, id: crypto.randomUUID() }]
      })),
      
      removeGroup: (id) => set((state) => ({
        triggerGroups: state.triggerGroups.filter(g => g.id !== id)
      })),
      
      updateGroup: (id, updates) => set((state) => ({
        triggerGroups: state.triggerGroups.map(g => 
          g.id === id ? { ...g, ...updates } : g
        )
      })),
      
      addCondition: (groupId, condition) => set((state) => ({
        triggerGroups: state.triggerGroups.map(g => 
          g.id === groupId 
            ? { ...g, conditions: [...g.conditions, { ...condition, id: crypto.randomUUID() }] }
            : g
        )
      })),
      
      removeCondition: (groupId, conditionId) => set((state) => ({
        triggerGroups: state.triggerGroups.map(g => 
          g.id === groupId 
            ? { ...g, conditions: g.conditions.filter(c => c.id !== conditionId) }
            : g
        )
      })),
      
      updateCondition: (groupId, conditionId, updates) => set((state) => ({
        triggerGroups: state.triggerGroups.map(g => 
          g.id === groupId 
            ? {
                ...g,
                conditions: g.conditions.map(c => 
                  c.id === conditionId ? { ...c, ...updates } : c
                )
              }
            : g
        )
      }))
    }),
    {
      name: 'trigger-storage'
    }
  )
);

export { useTriggerStore };