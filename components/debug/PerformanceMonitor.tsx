"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useTokenStore } from "@/lib/store/useTokenStore";

interface PerformanceMetrics {
  fps: number;
  memory: {
    usedHeap: number;
    totalHeap: number;
    limit: number;
  };
  dbSize: {
    tokens: number;
    trades: number;
    subscriptions: number;
  };
  renderTimes: {
    tokenList: number;
    charts: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatTimeAgo(date: number): string {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PerformanceMonitor() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: { usedHeap: 0, totalHeap: 0, limit: 0 },
    dbSize: { tokens: 0, trades: 0, subscriptions: 0 },
    renderTimes: { tokenList: 0, charts: 0 }
  });
  const pruneStats = useTokenStore(state => state.pruneStats);

  // Monitor FPS and Memory
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateMetrics = () => {
      // Update FPS
      const now = performance.now();
      const delta = now - lastTime;
      frameCount++;

      if (delta >= 1000) {
        const fps = Math.round((frameCount * 1000) / delta);
        
        // Get memory info if available
        const memory = (performance as any).memory;
        const memoryMetrics = memory ? {
          usedHeap: memory.usedJSHeapSize,
          totalHeap: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        } : metrics.memory;

        setMetrics(prev => ({ 
          ...prev, 
          fps,
          memory: memoryMetrics
        }));

        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(updateMetrics);
    };

    const frameId = requestAnimationFrame(updateMetrics);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Monitor database size
  useLiveQuery(async () => {
    const dbSize = {
      tokens: await db.tokens.count(),
      trades: await db.orders.count(),
      subscriptions: await db.subscriptions.count()
    };
    setMetrics(prev => ({ ...prev, dbSize }));
  }, [], { interval: 5000 });

  return (
    <Card className="fixed top-4 right-4 w-80 opacity-90 hover:opacity-100 transition-opacity">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Performance Monitor</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-2 text-xs py-2">
          <div className="flex justify-between">
            <span>FPS</span>
            <span className={metrics.fps < 30 ? "text-red-500" : "text-green-500"}>
              {metrics.fps}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Memory Usage</div>
            <div className="grid grid-cols-2 gap-1">
              <div>Used Heap</div>
              <div className="text-right">{formatBytes(metrics.memory.usedHeap)}</div>
              <div>Total Heap</div>
              <div className="text-right">{formatBytes(metrics.memory.totalHeap)}</div>
              <div>Heap Limit</div>
              <div className="text-right">{formatBytes(metrics.memory.limit)}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">Database Size</div>
            <div className="grid grid-cols-2 gap-1">
              <div>Tokens</div>
              <div className="text-right">{metrics.dbSize.tokens}</div>
              <div>Trades</div>
              <div className="text-right">{metrics.dbSize.trades}</div>
              <div>Subscriptions</div>
              <div className="text-right">{metrics.dbSize.subscriptions}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">Pruning Status</div>
            <div className="grid grid-cols-2 gap-1">
              <div>Last Run</div>
              <div className="text-right">
                {pruneStats.lastRun ? formatTimeAgo(pruneStats.lastRun) : 'Never'}
              </div>
              {pruneStats.lastRun && (
                <>
                  <div>Tokens Removed</div>
                  <div className="text-right">{pruneStats.tokens}</div>
                  <div>Orphaned Trades</div>
                  <div className="text-right">{pruneStats.orphanedTrades}</div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 