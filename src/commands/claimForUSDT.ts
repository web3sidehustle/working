import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { botChainExplorerUrl } from "../lib/botChainConfig";
import { sendUSDT } from "../lib/sendUSDT";

const CLAIM_AMOUNT = 10; // 10 bUSDT per claim
const TREASURY_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

if (!TREASURY_PRIVATE_KEY) {
  console.warn("⚠️  Warning: WALLET_PRIVATE_KEY not set. Claim commands will fail.");
}

export async function claimUSDTCommand1(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    // 1. Load user wallet
    const { address } = await getOrCreateWallet(telegramId, username);
    if (!address) {
      await bot.sendMessage(chatId, "❌ Could not retrieve your wallet address.");
      return;
    }

    if (!TREASURY_PRIVATE_KEY) {
      throw new Error("❌ Missing WALLET_PRIVATE_KEY in environment variables");
    }

    // 2. Transfer bUSDT from the treasury/owner wallet to the recipient
    const txHash = await sendUSDT({
      fromPrivateKey: TREASURY_PRIVATE_KEY,
      toAddress: address,
      amount: CLAIM_AMOUNT,
    });

    const explorerUrl = `${botChainExplorerUrl}/tx/${txHash}`;
    await bot.sendMessage(
      chatId,
      `✅ <b>Claim successful!</b>\n\n💸 ${CLAIM_AMOUNT} bUSDT sent from the treasury owner wallet to <code>${address}</code>\n\n🔗 <a href="${explorerUrl}">View on BOTScan</a>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.error("Claim error:", err);
    await bot.sendMessage(chatId, "❌ Claim failed. Try again later or contact support.");
  }
}