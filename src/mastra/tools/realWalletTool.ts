// src/mastra/tools/realWalletTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";
import { getOrCreateWallet } from "../../commands/utils/walletManager";
import { getUserContext } from "../context/userContext";

export const realWalletTool = createTool({
  id: "realWallet",
  description: "Get or create the user's BOT Chain wallet address",
  inputSchema: z.object({
    telegramId: z.string().optional().describe("Telegram user ID"),
    username: z.string().optional().describe("Telegram username"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
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

      const { address } = await getOrCreateWallet(telegramId, username);

      return {
        success: true,
        address,
        message: `🪪 <b>Your wallet address:</b>\n<code>${address}</code>`,
      };
    } catch (error) {
      console.error("Wallet error:", error);
      return {
        success: false,
        message: `❌ Unable to retrieve wallet: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
