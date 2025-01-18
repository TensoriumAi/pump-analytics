import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatTokenPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(price)) {
    return '0.0 SOL';
  }
  
  if (price === 0) return '0.0 SOL';
  
  // Convert to string to handle very small numbers
  let priceString = price.toString();
  
  // If it's in scientific notation, convert to decimal
  if (priceString.includes('e')) {
    const [mantissa, exponent] = priceString.split('e');
    const exp = parseInt(exponent);
    
    if (exp < 0) {
      // Create leading zeros
      priceString = '0.' + '0'.repeat(Math.abs(exp) - 1) + 
        mantissa.replace('.', '');
    }
  }
  
  // Trim to max 9 significant digits after decimal
  if (priceString.includes('.')) {
    const [whole, decimal] = priceString.split('.');
    priceString = whole + '.' + decimal.slice(0, 9);
  }
  
  // Trim trailing zeros
  priceString = priceString.replace(/\.?0+$/, '');
  
  return priceString + ' SOL';
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
