export async function getUSDTPriceInNGN(ngnAmount: number): Promise<number> {
  // Hardcoded for now — ideally replace with real API like CoinGecko or Binance
  const usdRate = 1500; // 1 USDT = 1500 NGN (example)
  //return ngnAmount / exchangeRate;
  return +(ngnAmount / usdRate).toFixed(2);
}