// src/mastra/tools/realClaimTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";
import { getOrCreateWallet } from "../../commands/utils/walletManager";
import { botChainExplorerUrl } from "../../lib/botChainConfig";
import { sendUSDT } from "../../lib/sendUSDT";
import { getUserContext } from "../context/userContext";

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
if (!PRIVATE_KEY) {
  throw new Error("Missing WALLET_PRIVATE_KEY in environment variables.");
}

const CLAIM_AMOUNT = 10; // 10 bUSDT per claim

export const realClaimTool = createTool({
  id: "realClaim",
  description: "Claim 10 bUSDT test tokens from the treasury faucet",
  inputSchema: z.object({
    telegramId: z.string().optional().describe("Telegram user ID"),
    username: z.string().optional().describe("Telegram username"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    txHash: z.string().optional(),
    address: z.string().optional(),
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

      // Get or create wallet
      const { address: userAddress } = await getOrCreateWallet(telegramId, username);

      // Send USDT
      const txHash = await sendUSDT({
        fromPrivateKey: PRIVATE_KEY,
        toAddress: userAddress as `0x${string}`,
        amount: CLAIM_AMOUNT,
      });

      const explorerUrl = `${botChainExplorerUrl}/tx/${txHash}`;

      return {
        success: true,
        txHash,
        address: userAddress,
        message: `✅ <b>Successfully claimed ${CLAIM_AMOUNT} bUSDT!</b>\n\n💰 Sent to: <code>${userAddress}</code>\n\n🔗 <a href="${explorerUrl}">View transaction on BOTScan</a>`,
      };
    } catch (error) {
      console.error("Claim error:", error);
      return {
        success: false,
        message: `❌ Claim failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
