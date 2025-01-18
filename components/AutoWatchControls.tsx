"use client";

import { useTokenStore } from '@/lib/store/useTokenStore';
import { Switch } from '@/components/ui/switch';
import { Eye } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AutoWatchControls() {
  const { watchSimilarNames, setWatchSimilarNames } = useTokenStore(state => ({
    watchSimilarNames: state.watchSimilarNames,
    setWatchSimilarNames: state.setWatchSimilarNames
  }));
  
  const handleToggle = (enabled: boolean) => {
    setWatchSimilarNames(enabled);
  };

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 bg-background/95 p-2 rounded-lg shadow-md border">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Eye className={`w-4 h-4 ${watchSimilarNames ? 'text-green-500' : 'text-gray-500'}`} />
            <Switch 
              checked={watchSimilarNames}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-green-500"
            />
            <span className="text-sm ml-2">
              {watchSimilarNames ? 'Auto-Watch On' : 'Auto-Watch Off'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to {watchSimilarNames ? 'disable' : 'enable'} auto-watch</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
} 