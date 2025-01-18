export function formatPrice(price: number): string {
  if (price === 0) return '0';
  
  if (price < 0.000001) {
    // Convert to scientific notation for very small numbers
    return price.toExponential(2);
  } else if (price < 0.001) {
    // Show more decimals for small numbers
    return price.toFixed(9);
  } else if (price < 1) {
    // Show fewer decimals as numbers get larger
    return price.toFixed(6);
  } else {
    return price.toFixed(2);
  }
} 