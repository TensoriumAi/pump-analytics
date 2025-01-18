"use client";

import { Button } from "./ui/button";
import { db } from "@/lib/db";
import { useTokenStore } from "@/lib/store/useTokenStore";
import { Trash2 } from "lucide-react";
import { wsService } from "@/lib/websocket";

export function WipeDatabase() {
  const { actions } = useTokenStore();

  const handleWipe = async () => {
    if (!confirm('Are you sure you want to wipe all database tables? This cannot be undone.')) {
      return;
    }

    try {
      // Delete all records from each table
      await db.orders.clear();
      await db.tokens.clear();
      // await db.triggers.clear();
      await db.settings.clear();
      await db.subscriptions.clear();

      // Clear WebSocket subscriptions
      wsService.setAutoResubscribe(false);

      // Reset token store
      await actions.loadTokens();

      console.log('🗑️ Database wiped successfully');
    } catch (error) {
      console.error('❌ Error wiping database:', error);
    }
  };

  return (
    <Button 
      variant="destructive" 
      size="sm"
      onClick={handleWipe}
      className="fixed bottom-4 left-4 z-50 gap-2"
    >
      <Trash2 className="w-4 h-4" />
      Wipe DB
    </Button>
  );
} 