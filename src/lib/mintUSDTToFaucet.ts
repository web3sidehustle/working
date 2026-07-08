// lib/mintUSDTToFaucet.ts
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import bUSDTAbi from "../abi/usdt_abi.json";
import { botChainTestnet } from "./botChainConfig";

export async function mintUSDTToFaucet(amount: number = 1000000) {
  const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
  const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;

  if (!PRIVATE_KEY || !USDT_CONTRACT_ADDRESS) {
    console.error("❌ Missing WALLET_PRIVATE_KEY or USDT_CONTRACT_ADDRESS");
    return;
  }

  // Format private key
  const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);

  console.log("🔨 Minting bUSDT to faucet...");
  console.log("Faucet Address:", account.address);
  console.log("Amount to mint:", amount, "bUSDT");

  const walletClient = createWalletClient({
    account,
    chain: botChainTestnet,
    transport: http(botChainTestnet.rpcUrls.default.http[0]),
  });

  try {
    // Call mint(address to, uint256 amount)
    const amountInUnits = parseUnits(amount.toString(), 18);
    
    const txHash = await walletClient.writeContract({
      abi: bUSDTAbi,
      address: USDT_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "mint",
      args: [account.address, amountInUnits],
    });

    console.log(`\n✅ Mint transaction successful!`);
    console.log(`TX Hash: ${txHash}`);
    console.log(`Explorer: https://scan.bohr.life/tx/${txHash}`);
    console.log(`\n${amount} bUSDT minted to faucet wallet.`);

  } catch (error) {
    console.error("❌ Error minting bUSDT:", error);
  }
}

// Run if executed directly
if (require.main === module) {
  const amount = process.argv[2] ? parseInt(process.argv[2]) : 1000000;
  mintUSDTToFaucet(amount);
}
