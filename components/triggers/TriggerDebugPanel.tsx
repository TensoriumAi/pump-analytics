import { Button } from "../ui/button";
import { triggerEvaluator } from "@/lib/services/TriggerEvaluator";
import { useTriggerStore } from "@/lib/store/useTriggerStore";
import { wsService } from "@/lib/websocket";

export function TriggerDebugPanel() {
  const { triggerGroups } = useTriggerStore();

  const testTrigger = async (groupId: string) => {
    const group = triggerGroups.find(g => g.id === groupId);
    if (!group) return;

    wsService.log('🔍 Manually testing trigger group:', group.name);

    // Simulate a trade event
    const mockTrade = {
      mint: 'TEST-MINT',
      txType: 'buy',
      timestamp: Date.now(),
      // ... other required trade data
    };

    const result = await triggerEvaluator.evaluateGroup(group, mockTrade);
    
    wsService.log('📊 Trigger test results:', {
      group: group.name,
      conditions: group.conditions.length,
      result
    });
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="font-bold mb-2">Trigger Debug</h3>
      
      <div className="space-y-2">
        {triggerGroups.map(group => (
          <div key={group.id} className="flex items-center justify-between bg-secondary/50 p-2 rounded">
            <div>
              <div className="font-medium">{group.name}</div>
              <div className="text-xs text-muted-foreground">
                {group.conditions.length} conditions ({group.operator})
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => testTrigger(group.id)}
            >
              Test Trigger
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 