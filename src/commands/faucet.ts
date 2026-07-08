import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { botChainExplorerUrl, botChainTestnet } from "../lib/botChainConfig";

export async function faucetCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    // 1. Load user wallet
    const { address: userAddress } = await getOrCreateWallet(telegramId, username);

    // 2. Load and validate faucet wallet
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
    if (!PRIVATE_KEY) {
      throw new Error("Missing WALLET_PRIVATE_KEY in environment");
    }

    const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    const faucetAccount = privateKeyToAccount(formattedKey as `0x${string}`);

    // 3. Create wallet client for BOTChain
    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: botChainTestnet,
      transport: http(botChainTestnet.rpcUrls.default.http[0]),
    });

    // 4. Send 1 BOT to user
    const faucetAmount = parseEther("0.01");
    const txHash = await walletClient.sendTransaction({
      to: userAddress as `0x${string}`,
      value: faucetAmount,
    });

    // 5. Respond with success
    const explorerUrl = `${botChainExplorerUrl}/tx/${txHash}`;
    await bot.sendMessage(chatId, `✅ <b>0.01 BOT faucet sent!</b>\n\n💰 Sent to: <code>${userAddress}</code>\n\n🔗 <a href="${explorerUrl}">View transaction on BOTScan</a>`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Satisfied", callback_data: "satisfied" }],
          [{ text: "🚿 Get more BOT", callback_data: "bot faucet", url: "https://faucet.botchain.ai/basic" }],
        ],
      },
    });

  } catch (err) {
    console.error("Faucet error:", err);
    await bot.sendMessage(chatId, "❌ Faucet request failed. Please try again or contact support.");
  }
}
