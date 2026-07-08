import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { botChainExplorerUrl } from "../lib/botChainConfig";
import { sendUSDT } from "../lib/sendUSDT";

const CLAIM_AMOUNT = 10; // 10 bUSDT per claim
const TREASURY_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

if (!TREASURY_PRIVATE_KEY) {
  console.warn("⚠️  Warning: WALLET_PRIVATE_KEY not set. Claim transfers will fail.");
}

export async function claimUSDTCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Unable to identify Telegram account.");
    return;
  }

  try {
    // Load wallet info for Telegram user
    const { address } = await getOrCreateWallet(telegramId, username);

    if (!address) {
      await bot.sendMessage(chatId, "❌ Could not retrieve your wallet address.");
      return;
    }

    if (!TREASURY_PRIVATE_KEY) {
      throw new Error("WALLET_PRIVATE_KEY not configured. Cannot process claim.");
    }

    const txHash = await sendUSDT({
      fromPrivateKey: TREASURY_PRIVATE_KEY,
      toAddress: address,
      amount: CLAIM_AMOUNT,
    });

    await bot.sendMessage(
      chatId,
      `✅ <b>Claim successful!</b>\n\n💸 ${CLAIM_AMOUNT} bUSDT sent from the treasury owner wallet to <code>${address}</code>\n\n🔗 <a href="${botChainExplorerUrl}/tx/${txHash}">View on BOTScan</a>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Claim error:", err);
    await bot.sendMessage(chatId, "❌ Claim failed. Please try again.");
  }
}