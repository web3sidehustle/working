import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { createPublicClient, http, formatUnits } from "viem";
import { Abi } from "viem";
import bUSDTAbi from "../abi/usdt_abi.json";
import "dotenv/config";
import { botChainExplorerUrl, botChainTestnet } from "../lib/botChainConfig";

export async function balanceCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;
  const chatId = msg.chat.id;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    const { privateKey, address } = await getOrCreateWallet(telegramId, username);
    if (!address) {
      await bot.sendMessage(chatId, "❌ Could not retrieve your wallet address.");
      return;
    }

    const publicClient = createPublicClient({
      chain: botChainTestnet,
      transport: http(botChainTestnet.rpcUrls.default.http[0]),
    });

    // 🟡 Get native BOT balance
    const botBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    const formattedBot = formatUnits(botBalance, 18);

    const kusdtBalance = await publicClient.readContract({
      address: process.env.USDT_CONTRACT_ADDRESS! as `0x${string}`,
      abi: bUSDTAbi as Abi,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });

    const formattedKusdt = formatUnits(kusdtBalance as bigint, 6);

    const explorerUrl = `${botChainExplorerUrl}/address/${address}`;

    await bot.sendMessage(chatId, 
  `💰 <b>Your BOT Wallet Balance</b>\n\n` +
  `📍 <b>Address:</b> <code>${address}</code>\n\n` +
  `💠 <b>BOT:</b> ${formattedBot} BOT\n` +
  `🪙 <b>bUSDT:</b> ${formattedKusdt} bUSDT\n\n` +
  `🔗 <a href="${explorerUrl}">View on BOTScan</a>`,  {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Satisfied", callback_data: "satisfied" }],
          [{ text: "🚿 Get more BOT", callback_data: "bot faucet", url: "https://faucet.botchain.ai/basic" }],
          [{ text: "💬 Talk to a live agent", callback_data: "live_agent", url: "https://t.me/+TpTPlZOWPpUxZWE0" }],
        ],
      },
    });

  } catch (error) {
    console.error("Balance error:", error);
    await bot.sendMessage(chatId, "❌ I couldn’t fetch your balance right now. Please try again in a moment.");
  }
}