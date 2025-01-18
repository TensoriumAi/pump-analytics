import { useEffect, useState } from 'react';
import { triggerEvaluator } from '@/lib/services/TriggerEvaluator';

export function TriggerStatus() {
  const [stats, setStats] = useState({
    queued: 0,
    processed: 0,
    lastTrigger: null as string | null
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        queued: triggerEvaluator.getQueueLength(),
        processed: triggerEvaluator.getProcessedCount(),
        lastTrigger: triggerEvaluator.getLastTriggerTime()
          ? new Date(triggerEvaluator.getLastTriggerTime()!).toLocaleTimeString()
          : null
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-background/80 backdrop-blur p-2 rounded-lg shadow-lg">
      <div className="text-xs space-y-1">
        <div>Queued Triggers: {stats.queued}</div>
        <div>Processed: {stats.processed}</div>
        {stats.lastTrigger && (
          <div>Last Trigger: {stats.lastTrigger}</div>
        )}
      </div>
    </div>
  );
} 