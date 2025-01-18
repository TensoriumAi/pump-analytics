"use client";

import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Settings2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTriggerStore, TriggerOperator, TriggerComparison, TriggerCondition } from "@/lib/store/useTriggerStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent } from "../ui/card";
import { useState } from "react";
import { wsService } from "@/lib/websocket";
import { useTokenStore } from "@/lib/store/useTokenStore";
import { db } from "@/lib/db";

const METRICS = {
  volumeRate: { label: 'Volume Rate', unit: 'SOL/min' },
  tradeFrequency: { label: 'Trade Frequency', unit: 'trades/min' },
  priceChange: { label: 'Price Change', unit: '%' },
  totalVolume: { label: 'Total Volume', unit: 'SOL' },
  volumeDecline: { label: 'Volume Decline', unit: '% from peak' },
  inactiveTime: { label: 'Inactive Time', unit: 'seconds' },
  priceDrop: { label: 'Price Drop', unit: '% from peak' },
  buyPercentage: { label: 'Buy Percentage', unit: '%' },
  wildcardSearch: { label: 'Wildcard Search', unit: 'pattern' },
  llmPrompt: { label: 'LLM Prompt', unit: 'prompt' },
  pruneInterval: { label: 'Prune Interval', unit: 'minutes' }
};

const COMPARISONS: TriggerComparison[] = ['>', '<', '=', '>=', '<='];

const PRUNE_INTERVALS = [
  { value: '5', label: '5 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '360', label: '6 hours' },
  { value: '1440', label: '24 hours' },
  { value: '0', label: 'Never' }
];

// Custom condition component for text-based inputs
function TextCondition({ 
  groupId, 
  condition, 
  updateCondition, 
  removeCondition 
}: { 
  groupId: string;
  condition: TriggerCondition;
  updateCondition: (groupId: string, conditionId: string, updates: Partial<TriggerCondition>) => void;
  removeCondition: (groupId: string, conditionId: string) => void;
}) {
  const isWildcard = condition.metric === 'wildcardSearch';
  
  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.metric}
        onValueChange={(value) => 
          updateCondition(groupId, condition.id, { metric: value as TriggerCondition['metric'] })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(METRICS).map(([value, { label }]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isWildcard ? (
        <Input
          placeholder="e.g., *pepe*, sol*, *coin"
          value={condition.pattern || ''}
          onChange={(e) => 
            updateCondition(groupId, condition.id, { pattern: e.target.value })
          }
          className="flex-1"
        />
      ) : (
        <textarea
          placeholder="Enter your LLM prompt..."
          value={condition.prompt || ''}
          onChange={(e) => 
            updateCondition(groupId, condition.id, { prompt: e.target.value })
          }
          className="flex-1 min-h-[80px] p-2 rounded-md border"
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeCondition(groupId, condition.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TriggerConfigDrawer() {
  const { triggerGroups, addGroup, removeGroup, updateGroup, addCondition, removeCondition, updateCondition } = useTriggerStore();
  const [newGroupType, setNewGroupType] = useState<'watch' | 'unwatch'>('watch');
  const [detailedLogging, setDetailedLogging] = useState(false);
  const [watchSimilarNames, setWatchSimilarNames] = useState(false);
  const { watchedTokens, addWatchedToken } = useTokenStore();
  const [pruneInterval, setPruneInterval] = useState('5');
  const startPruning = useTokenStore(state => state.startPruneInterval);
  const stopPruning = useTokenStore(state => state.stopPruneInterval);
  const pruneIntervalActive = useTokenStore(state => state.pruneInterval !== null);

  const toggleDetailedLogging = (enabled: boolean) => {
    setDetailedLogging(enabled);
    wsService.setDetailedLogging(enabled);
  };

  const handleWatchSimilarNames = async (enabled: boolean) => {
    console.log('Toggle watch similar names:', enabled);
    setWatchSimilarNames(enabled);
    
    if (enabled) {
      try {
        const tokens = await db.tokens.toArray();
        console.log('Total tokens for initial scan:', tokens.length);
        
        const watchedNames = new Set(
          Array.from(watchedTokens).map((mint: string) => {
            const token = tokens.find((t: any) => t.mint === mint);
            console.log('Found watched token:', token?.name, mint);
            return token?.name.toLowerCase();
          })
        );
        
        console.log('Current watched names:', Array.from(watchedNames));
        
        tokens.forEach((token: any) => {
          if (token.name && watchedNames.has(token.name.toLowerCase())) {
            console.log('Adding similar token on initial scan:', token.name, token.mint);
            addWatchedToken(token.mint);
          }
        });
      } catch (error) {
        console.error('Error watching similar names:', error);
      }
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Trigger Groups
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Trigger Groups</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 border-b">
          <div className="flex items-center justify-between">
            <Label>Detailed Console Logging</Label>
            <Switch
              checked={detailedLogging}
              onCheckedChange={toggleDetailedLogging}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Watch Similar Names</Label>
              <p className="text-xs text-muted-foreground">
                Automatically watch tokens with matching names
              </p>
            </div>
            <Switch
              checked={watchSimilarNames}
              onCheckedChange={handleWatchSimilarNames}
            />
          </div>

          <div className="space-y-1">
            <Label>Prune Schedule</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Automatically remove tokens without updates after:
            </p>
            <div className="flex gap-2">
              <Select
                value={pruneInterval}
                onValueChange={(value) => {
                  setPruneInterval(value);
                  if (pruneIntervalActive) {
                    startPruning(parseInt(value));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRUNE_INTERVALS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant={pruneIntervalActive ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  if (pruneIntervalActive) {
                    stopPruning();
                  } else {
                    startPruning(parseInt(pruneInterval));
                  }
                }}
              >
                {pruneIntervalActive ? "Stop Pruning" : "Start Pruning"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          {triggerGroups.map((group) => (
            <Card key={group.id} className="relative">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={group.enabled}
                      onCheckedChange={(enabled) => updateGroup(group.id, { enabled })}
                    />
                    <Input
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      className="w-[200px]"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGroup(group.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Select
                  value={group.operator}
                  onValueChange={(value: TriggerOperator) => 
                    updateGroup(group.id, { operator: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">ALL conditions must match</SelectItem>
                    <SelectItem value="OR">ANY condition must match</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  {group.conditions.map((condition) => (
                    <div key={condition.id}>
                      {condition.metric === 'wildcardSearch' || condition.metric === 'llmPrompt' ? (
                        <TextCondition
                          groupId={group.id}
                          condition={condition}
                          updateCondition={updateCondition}
                          removeCondition={removeCondition}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={condition.metric}
                            onValueChange={(value) => 
                              updateCondition(group.id, condition.id, { metric: value as TriggerCondition['metric'] })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(METRICS).map(([value, { label }]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={condition.comparison}
                            onValueChange={(value) => 
                              updateCondition(group.id, condition.id, { comparison: value as TriggerComparison })
                            }
                          >
                            <SelectTrigger className="w-[60px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPARISONS.map((comp) => (
                                <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            type="number"
                            value={condition.value}
                            onChange={(e) => 
                              updateCondition(group.id, condition.id, { value: parseFloat(e.target.value) })
                            }
                            className="w-[80px]"
                          />

                          <span className="text-sm text-muted-foreground w-[80px]">
                            {METRICS[condition.metric as keyof typeof METRICS].unit}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCondition(group.id, condition.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => addCondition(group.id, {
                      metric: 'volumeRate',
                      comparison: '>',
                      value: 0,
                      unit: METRICS.volumeRate.unit
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Select
              value={newGroupType}
              onValueChange={(value: 'watch' | 'unwatch') => setNewGroupType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="watch">Watch Group</SelectItem>
                <SelectItem value="unwatch">Unwatch Group</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => addGroup({
                name: `New ${newGroupType} Group`,
                enabled: true,
                type: newGroupType,
                operator: 'AND',
                conditions: []
              })}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 