"use client";

import { Star } from "lucide-react";
import { Button } from "../ui/button";
import { useTokenStore } from "@/lib/store/useTokenStore";
import { Token } from "@/types/token";

export function StarButton({ token }: { token: Token }) {
  const watchToken = useTokenStore(state => state.watchToken);
  const unwatchToken = useTokenStore(state => state.unwatchToken);
  const isWatched = token.watchStatus === 'watched';

  const handleClick = async () => {
    if (isWatched) {
      unwatchToken(token.mint);
    } else {
      watchToken(token);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={handleClick}
    >
      <Star
        className={`h-4 w-4 ${
          isWatched ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    </Button>
  );
} 