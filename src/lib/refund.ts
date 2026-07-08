import { sendUSDT } from "./sendUSDT";

export async function refundUsdt({
  to,
  amount,
}: {
  to: string;
  amount: number;
}) {
  const FAUCET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
  if (!FAUCET_PRIVATE_KEY) {
    throw new Error("Missing WALLET_PRIVATE_KEY in environment");
  }

  return await sendUSDT({
    fromPrivateKey: FAUCET_PRIVATE_KEY,
    toAddress: to,
    amount,
  });
}