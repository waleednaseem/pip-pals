/** Static FX rates vs PKR (approx). Replace with live API later. */
export const FX_TO_PKR: Record<string, number> = {
  USD: 278.5,
  EUR: 302.0,
  GBP: 352.0,
  PKR: 1,
  AED: 75.8,
  SAR: 74.2,
  INR: 3.35,
  CAD: 202.0,
  AUD: 181.0,
};

export const CURRENCY_CODES = Object.keys(FX_TO_PKR);

export function convertCurrency(
  amount: number,
  from: string,
  to: string
): number {
  const fromRate = FX_TO_PKR[from];
  const toRate = FX_TO_PKR[to];
  if (fromRate == null || toRate == null) {
    throw new Error(`Unsupported currency pair: ${from} → ${to}`);
  }
  const inPkr = amount * fromRate;
  return inPkr / toRate;
}
