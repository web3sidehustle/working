// src/mastra/tools/realFaucetTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";
import { getOrCreateWallet } from "../../commands/utils/walletManager";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { botChainExplorerUrl, botChainTestnet } from "../../lib/botChainConfig";
import { getUserContext } from "../context/userContext";

export const realFaucetTool = createTool({
  id: "realFaucet",
  description: "Request 0.01 BOT test tokens from the testnet faucet",
  inputSchema: z.object({
    telegramId: z.string().optional().describe("Telegram user ID"),
    username: z.string().optional().describe("Telegram username"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    txHash: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      // Try to get telegramId from tool input or from global context
      let telegramId = (context.telegramId as string | undefined) || getUserContext().telegramId;
      let username = (context.username as string | undefined) || getUserContext().username;

      if (!telegramId) {
        return {
          success: false,
          message: "❌ Could not identify your Telegram account.",
        };
      }

      // Get or create user wallet
      const { address: userAddress } = await getOrCreateWallet(telegramId, username);

      // Load faucet wallet
      const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
      if (!PRIVATE_KEY) {
        throw new Error("Missing WALLET_PRIVATE_KEY in environment");
      }

      const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
      const faucetAccount = privateKeyToAccount(formattedKey as `0x${string}`);

      // Create wallet client
      const walletClient = createWalletClient({
        account: faucetAccount,
        chain: botChainTestnet,
        transport: http(botChainTestnet.rpcUrls.default.http[0]),
      });

      // Send 0.01 BOT
      const faucetAmount = parseEther("0.01");
      const txHash = await walletClient.sendTransaction({
        to: userAddress as `0x${string}`,
        value: faucetAmount,
      });

      const explorerUrl = `${botChainExplorerUrl}/tx/${txHash}`;

      return {
        success: true,
        txHash,
        message: `✅ <b>0.01 BOT faucet sent!</b>\n\n💰 Sent to: <code>${userAddress}</code>\n\n🔗 <a href="${explorerUrl}">View transaction on BOTScan</a>`,
      };
    } catch (error) {
      console.error("Faucet error:", error);
      return {
        success: false,
        message: `❌ Faucet request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
