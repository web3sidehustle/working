// lib/sendUSDT.ts
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import bUSDTAbi from "../abi/usdt_abi.json";
import { botChainTestnet } from "./botChainConfig";

const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS!;
const PAYMASTER_RPC_URL =
  process.env.BOTCHAIN_PAYMASTER_RPC_URL ||
  process.env.PAYMASTER_RPC_URL ||
  process.env.PAYMASTER_URL;

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

  if (PAYMASTER_RPC_URL) {
    try {
      const paymasterClient = createPublicClient({
        chain: botChainTestnet,
        transport: http(PAYMASTER_RPC_URL),
      });

      const data = encodeFunctionData({
        abi: bUSDTAbi,
        functionName: "transfer",
        args: [toAddress as `0x${string}`, amountInUnits],
      });

      const nonce = await paymasterClient.getTransactionCount({ address: account.address });
      const gasLimit = await paymasterClient.estimateGas({
        account: account.address,
        to: contract.address,
        data,
        value: 0n,
      });

      const signedTx = await account.signTransaction({
        chain: botChainTestnet,
        from: account.address,
        to: contract.address,
        nonce,
        data,
        value: 0n,
        gas: gasLimit,
        gasPrice: 0n,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
      } as any);

      const txHash = await paymasterClient.request({
        method: "eth_sendRawTransaction",
        params: [signedTx],
      });

      if (typeof txHash === "string" && txHash.startsWith("0x")) {
        return txHash;
      }
    } catch (error) {
      console.warn("Gasless transfer failed, falling back to standard transfer:", error);
    }
  }

  const hash = await walletClient.writeContract({
    ...contract,
    functionName: "transfer",
    args: [toAddress as `0x${string}`, amountInUnits],
  });

  return hash;
}