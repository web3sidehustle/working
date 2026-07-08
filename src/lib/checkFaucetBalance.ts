// lib/checkFaucetBalance.ts
import { createPublicClient, http, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import bUSDTAbi from "../abi/usdt_abi.json";
import { botChainTestnet } from "./botChainConfig";

export async function checkFaucetBalance() {
  const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
  const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;

  if (!PRIVATE_KEY || !USDT_CONTRACT_ADDRESS) {
    console.error("❌ Missing WALLET_PRIVATE_KEY or USDT_CONTRACT_ADDRESS");
    return;
  }

  // Format private key
  const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);

  console.log("🔍 Checking faucet balance...");
  console.log("Faucet Address:", account.address);
  console.log("Contract Address:", USDT_CONTRACT_ADDRESS);

  const publicClient = createPublicClient({
    chain: botChainTestnet,
    transport: http(botChainTestnet.rpcUrls.default.http[0]),
  });

  try {
    // Check bUSDT balance
    const balance = (await publicClient.readContract({
      abi: bUSDTAbi,
      address: USDT_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;

    const formattedBalance = formatUnits(balance, 18);
    console.log(`\n💰 Faucet bUSDT Balance: ${formattedBalance} bUSDT`);
    console.log(`   Raw: ${balance.toString()}`);

    if (balance === 0n) {
      console.log("\n⚠️  Balance is ZERO! Faucet needs bUSDT.");
      console.log("❌ Transfers will fail until faucet wallet receives bUSDT.");
    } else if (balance < 10n * 10n ** 18n) {
      console.log("\n⚠️  Balance is LOW (less than 10 bUSDT needed per claim).");
      console.log(`   Can only perform ${Number(balance) / 10n ** 18n} claims.`);
    } else {
      console.log(`\n✅ Faucet has sufficient balance for ${Number(balance / (10n * 10n ** 18n))} claims.`);
    }

    // Check native BOT balance
    const botBalance = await publicClient.getBalance({
      address: account.address,
    });
    const formattedBotBalance = formatUnits(botBalance, 18);
    console.log(`\n⛽ Native BOT Balance: ${formattedBotBalance} BOT`);

  } catch (error) {
    console.error("❌ Error checking balance:", error);
  }
}

// Run if executed directly
if (require.main === module) {
  checkFaucetBalance();
}
