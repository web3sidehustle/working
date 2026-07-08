// lib/sendUSDT.ts
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import bUSDTAbi from "../abi/usdt_abi.json";
import { botChainTestnet } from "./botChainConfig";

const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS!;

export async function sendUSDT({
  fromPrivateKey,
  toAddress,
  amount,
}: {
  fromPrivateKey: string;
  toAddress: string;
  amount: number;
}): Promise<string> {
  // Ensure private key has 0x prefix
  const formattedPrivateKey = fromPrivateKey.startsWith("0x")
    ? (fromPrivateKey as `0x${string}`)
    : (`0x${fromPrivateKey}` as `0x${string}`);

  const account = privateKeyToAccount(formattedPrivateKey);

  const walletClient = createWalletClient({
    account,
    chain: botChainTestnet,
    transport: http(botChainTestnet.rpcUrls.default.http[0]),
  });

  const contract = {
    abi: bUSDTAbi,
    address: USDT_CONTRACT_ADDRESS as `0x${string}`,
  };

  // bUSDT uses 6 decimals according to the contract
  const amountInUnits = parseUnits(amount.toString(), 6);

  const hash = await walletClient.writeContract({
    ...contract,
    functionName: "transfer",
    args: [toAddress as `0x${string}`, amountInUnits],
  });

  return hash;
}