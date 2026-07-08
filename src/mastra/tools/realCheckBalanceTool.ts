// src/mastra/tools/realCheckBalanceTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";
import { getOrCreateWallet } from "../../commands/utils/walletManager";
import { createPublicClient, http, formatUnits } from "viem";
import { Abi } from "viem";
import bUSDTAbi from "../../abi/usdt_abi.json";
import { botChainTestnet } from "../../lib/botChainConfig";
import { getUserContext } from "../context/userContext";

export const realCheckBalanceTool = createTool({
  id: "realCheckBalance",
  description: "Check the user's BOT and bUSDT wallet balance on BOTChain testnet",
  inputSchema: z.object({
    telegramId: z.string().optional().describe("Telegram user ID"),
    username: z.string().optional().describe("Telegram username"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    address: z.string().optional(),
    botBalance: z.string().optional(),
    usdtBalance: z.string().optional(),
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
          message: "❌ I couldn’t identify your Telegram account. Please start the bot again and try once more.",
        };
      }

      // Get or create wallet
      const { privateKey, address } = await getOrCreateWallet(telegramId, username);
      if (!address) {
        return {
          success: false,
          message: "❌ I couldn’t retrieve your wallet address just yet. Please try again in a moment.",
        };
      }

      // Create public client and fetch balances
      const publicClient = createPublicClient({
        chain: botChainTestnet,
        transport: http(botChainTestnet.rpcUrls.default.http[0]),
      });

      const botBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      const formattedBot = formatUnits(botBalance, 18);

      const kusdtBalance = await publicClient.readContract({
        address: process.env.USDT_CONTRACT_ADDRESS! as `0x${string}`,
        abi: bUSDTAbi as Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      const formattedKusdt = formatUnits(kusdtBalance as bigint, 6);

      return {
        success: true,
        address,
        botBalance: formattedBot,
        usdtBalance: formattedKusdt,
        message: `💰 <b>Your BOT Wallet Balance</b>\n\n📍 <b>Address:</b> <code>${address}</code>\n\n💠 <b>BOT:</b> ${formattedBot} BOT\n🪙 <b>bUSDT:</b> ${formattedKusdt} bUSDT`,
      };
    } catch (error) {
      console.error("Balance check error:", error);
      return {
        success: false,
        message: `❌ Failed to fetch balance: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
