import TelegramBot from "node-telegram-bot-api";

export async function helpCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(
      chatId,
      `📖 <b>Welcome to BOT Chain DeFAI Bot</b>

This bot helps you interact with the BOT Chain testnet right from Telegram.

<b>🚰 Faucet</b>
- /faucet — Get 0.01 BOT test token to your wallet.

<b>💸 Claim</b>
- /claim — Claim 10 test bUSDT once per day.

<b>👛 Wallet</b>
- /mywallet — Show your wallet address.
- /balance — Check your token balances.

<b>🔁 Transfers</b>
- /transferusdt &lt;address|@username&gt; &lt;amount&gt; — Send USDT.
- /transferbot &lt;address|@username&gt; &lt;amount&gt; — Send BOT.

<b>📱 Airtime</b>
- /airtime &lt;phone&gt; &lt;amount&gt; &lt;countryCode&gt; — Buy airtime with USDT.
Example: <code>/airtime 2348012345678 1500 NG</code>

<b>🧪 Coming Soon</b>
- /swap — Swap tokens between USDT, BOT, and more.
- /airdrop — Claim campaign-based airdrops.

Need help with anything else? Just ask.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Satisfied", callback_data: "satisfied" }],
            [
              {
                text: "💬 Talk to a live agent",
                url: "https://t.me/+TpTPlZOWPpUxZWE0",
                callback_data: "live_agent",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error("❌ Help command failed:", error);
    await bot.sendMessage(chatId, "❌ Something went wrong displaying the help menu. Please try again later.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Satisfied", callback_data: "satisfied" }],
            [
              {
                text: "💬 Talk to a live agent",
                url: "https://t.me/+TpTPlZOWPpUxZWE0",
                callback_data: "live_agent",
              },
            ],
          ],
        },});
  }
}
