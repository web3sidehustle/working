// lib/verifyOwnerAddress.ts
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, formatUnits } from "viem";
import bUSDTAbi from "../abi/usdt_abi.json";
import { botChainTestnet } from "./botChainConfig";

export async function verifyOwnerAddress() {
  const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
  const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;

  if (!PRIVATE_KEY || !TREASURY_ADDRESS || !USDT_CONTRACT_ADDRESS) {
    console.error("❌ Missing env variables:", {
      WALLET_PRIVATE_KEY: !!PRIVATE_KEY,
      TREASURY_ADDRESS: !!TREASURY_ADDRESS,
      USDT_CONTRACT_ADDRESS: !!USDT_CONTRACT_ADDRESS,
    });
    return;
  }

  console.log("\n🔐 Verifying Owner Account...\n");

  // Format private key and get account
  const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);

  console.log("📋 Account from WALLET_PRIVATE_KEY:");
  console.log("   Address:", account.address);
  console.log("\n📋 TREASURY_ADDRESS from .env:");
  console.log("   Address:", TREASURY_ADDRESS);

  // Check if they match
  if (account.address.toLowerCase() === TREASURY_ADDRESS.toLowerCase()) {
    console.log("\n✅ MATCH! Private key corresponds to Treasury address.");
  } else {
    console.log("\n❌ MISMATCH! Private key does NOT match Treasury address.");
    console.log("   This is the problem! The owner's private key is wrong.");
    return;
  }

  // Check balances
  const publicClient = createPublicClient({
    chain: botChainTestnet,
    transport: http(botChainTestnet.rpcUrls.default.http[0]),
  });

  console.log("\n💰 Checking Balances...\n");

  try {
    // Check bUSDT balance
    const bUSDTBalance = (await publicClient.readContract({
      abi: bUSDTAbi,
      address: USDT_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;

    const formattedBUSDT = formatUnits(bUSDTBalance, 18);
    console.log(`bUSDT Balance: ${formattedBUSDT} bUSDT`);
    console.log(`  Raw: ${bUSDTBalance.toString()}`);

    if (bUSDTBalance === 0n) {
      console.log("  ❌ BALANCE IS ZERO! No bUSDT in treasury wallet.");
    } else if (bUSDTBalance < 10n * 10n ** 18n) {
      console.log(
        `  ⚠️  BALANCE TOO LOW! Only ${Number(bUSDTBalance) / 10 ** 18} bUSDT (need 10 per claim)`
      );
    } else {
      const claimCount = Number(bUSDTBalance / (10n * 10n ** 18n));
      console.log(`  ✅ Sufficient balance for ~${claimCount} claims`);
    }

    // Check native BOT balance
    const botBalance = await publicClient.getBalance({
      address: account.address,
    });
    const formattedBOT = formatUnits(botBalance, 18);
    console.log(`\nNative BOT Balance: ${formattedBOT} BOT`);

  } catch (error) {
    console.error("❌ Error checking balances:", error);
  }
}

// Run if executed directly
if (require.main === module) {
  verifyOwnerAddress();
}
