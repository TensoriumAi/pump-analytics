"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/lib/store/useTokenStore";

export function PruneInitializer() {
  useEffect(() => {
    const store = useTokenStore.getState();
    store.startPruneInterval(5); // 5 minutes default
    
    return () => {
      store.stopPruneInterval();
    };
  }, []);

  return null; // This component doesn't render anything
} 