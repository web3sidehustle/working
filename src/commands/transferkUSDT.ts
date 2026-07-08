import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { createWalletClient, getContract, parseUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import bUSDTAbi from "../abi/usdt_abi.json";
import { PrismaClient } from "@prisma/client";
import { botChainExplorerUrl, botChainTestnet } from "../lib/botChainConfig";

const prisma = new PrismaClient();

export async function transferUSDTCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Unable to identify your Telegram account.");
    return;
  }

  const parts = msg.text?.split(" ");
  const recipient = parts?.[1];
  const amountStr = parts?.[2];

  if (!recipient || !amountStr || isNaN(Number(amountStr))) {
    await bot.sendMessage(chatId, "❌ Usage: /transferusdt <@username|0xAddress> <amount>");
    return;
  }

  let recipientAddress: `0x${string}` | null = null;

  // Resolve alias or raw address
  if (recipient.startsWith("@")) {
    const username = recipient.slice(1);
    const wallet = await prisma.wallet.findUnique({ where: { username } });

    if (!wallet) {
      await bot.sendMessage(chatId, `❌ Alias @${username} not found.`);
      return;
    }
    recipientAddress = wallet.address as `0x${string}`;
  } else if (recipient.startsWith("0x") && recipient.length === 42) {
    recipientAddress = recipient as `0x${string}`;
  } else {
    await bot.sendMessage(chatId, "❌ Invalid recipient address or alias.");
    return;
  }

   

  try {
    const { privateKey, address: sender } = await getOrCreateWallet(telegramId, username);
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: botChainTestnet,
      transport: http(botChainTestnet.rpcUrls.default.http[0]),
    });

    const contract = getContract({
      abi: bUSDTAbi,
      address: process.env.USDT_CONTRACT_ADDRESS! as `0x${string}`,
      client: walletClient,
    });

    const decimals = 6;
    const amount = parseUnits(amountStr, decimals); // assumes bUSDT uses 6 decimals

    const hash = await contract.write.transfer([recipientAddress as `0x${string}`, amount]);

    const explorerUrl = `${botChainExplorerUrl}/tx/${hash}`;
    await bot.sendMessage(
      chatId,
      `✅ <b>Transfer successful</b>\n\n💸 <code>${amountStr} USDT</code> sent to <code>${recipient}</code>\n\n🔗 <a href="${explorerUrl}">View on BOTScan</a>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Transfer failed:", err);
    await bot.sendMessage(chatId, "❌ Transfer failed. Please try again or contact support.");
  }
}
