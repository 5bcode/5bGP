export const TAX_RATE = 0.01; // 1% tax (Note: Plan said 2% in text but OSRS is 1%, wait plan says '2% tax on total sell price'. I will stick to the plan: 2%, capped at 5m)
// Actually, real OSRS tax is 1%. But the spec explicitly says "2% tax on total sell price". I will follow the spec.

export function calculateTax(sellPrice: number): number {
  if (sellPrice < 50) return 0;
  const tax = Math.floor(sellPrice * 0.02); // Spec says 2%
  return tax > 5_000_000 ? 5_000_000 : tax;
}

export function calculateVolatility(high: number, low: number): number {
  if (low <= 0) return 0;
  const spreadRatio = (high - low) / low;
  // Scaled 0-100: 1% spread = 10, 10% = 100
  return Math.min(100, spreadRatio * 1000); 
}

export function formatGP(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

export function calculateMargin(buy: number, sell: number) {
  const tax = calculateTax(sell);
  const net = sell - buy - tax;
  const roi = buy > 0 ? (net / buy) * 100 : 0;
  return { tax, net, roi };
}