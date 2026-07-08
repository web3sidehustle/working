import TelegramBot from "node-telegram-bot-api";
import { kaiaDeFAIAgent } from "../agents/kaiaDefaiAgent";
import { setUserContext, clearUserContext } from "../context/userContext";
import { buildAirtimeCommandText, buildTransferCommandText, detectDirectActionIntent, getSimpleUserInfoResponse } from "./telegramIntentRouter";

export class TelegramIntegration {
  private bot: TelegramBot;
  private readonly MAX_MESSAGE_LENGTH = 4000;
  private readonly MAX_RESULT_LENGTH = 1000;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.bot.on("message", this.handleMessage.bind(this));
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!]/g, "\\$&");
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "... [truncated]";
  }

  private formatToolResult(result: any): string {
    try {
      const jsonString = JSON.stringify(result, null, 2);
      return this.escapeMarkdown(this.truncateString(jsonString, this.MAX_RESULT_LENGTH));
    } catch (error) {
      return `[Complex data structure - ${typeof result}]`;
    }
  }

  private suggestCommand(cmd: string): string {
    return `👉 Try this: \`${this.escapeMarkdown(cmd)}\``;
  }

  private getFallbackReply(text: string): string | null {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return null;

    if (/\b(check back later|come back later|later)\b/.test(normalized)) {
      return "No worries — I can help later. Try /help, or ask me for something simple like /balance, /mywallet, /claim, /faucet, or /airtime.";
    }

    if (/\b(help|what can you do|commands|menu)\b/.test(normalized)) {
      return "Absolutely — I can help with balances, wallet details, claiming test USDT, faucet requests, airtime top-up, and transfers. Try examples like /balance, /mywallet, /claim, /faucet, or /airtime.";
    }

    if (/\b(unsupported|not wired|not working|doesn't work|does not work)\b/.test(normalized)) {
      return "I’m still growing, so some features may not be wired yet. You can still try /help, or ask for something like /balance, /mywallet, /claim, /faucet, or /airtime.";
    }

    if (/\b(hi|hello|hey|thanks|thank you)\b/.test(normalized)) {
      return "Hello! I can help with balances, wallet info, claims, faucet, airtime, and transfers. Try /help or one of these quick commands: /balance, /mywallet, /claim, /faucet.";
    }

    if (/\b(checking|checking now|test|just checking|looking|user info|info)\b/.test(normalized)) {
      return "I’m here to help. Try one of these quick commands: /balance, /mywallet, /claim, /faucet, or /airtime.";
    }

    if (/^[a-z0-9\s\-_.!?,]+$/i.test(normalized) && normalized.split(/\s+/).length <= 3) {
      return "I can help with /balance, /mywallet, /claim, /faucet, /airtime, and transfers. Try one of those or ask me in plain English.";
    }

    return null;
  }

  private async updateOrSplitMessage(
    chatId: number,
    messageId: number | undefined,
    text: string
  ): Promise<number> {
    // If small enough, try to edit the existing message
    if (text.length <= this.MAX_MESSAGE_LENGTH && messageId) {
      try {
        await this.bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
        });
        return messageId;
      } catch (error) {
        console.error("Error updating message:", error);
        // fall through to sending messages
      }
    }

    // Split long text into chunks that fit within MAX_MESSAGE_LENGTH
    const chunks: string[] = [];
    if (text.length <= this.MAX_MESSAGE_LENGTH) {
      chunks.push(text);
    } else {
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= this.MAX_MESSAGE_LENGTH) {
          chunks.push(remaining);
          break;
        }

        // try to split on double newline, then single newline, then space
        const slice = remaining.substring(0, this.MAX_MESSAGE_LENGTH);
        const lastDoubleNewline = slice.lastIndexOf('\n\n');
        const lastNewline = slice.lastIndexOf('\n');
        const lastSpace = slice.lastIndexOf(' ');

        let splitAt = Math.max(lastDoubleNewline, lastNewline, lastSpace);
        if (splitAt <= 0) splitAt = this.MAX_MESSAGE_LENGTH;

        chunks.push(remaining.substring(0, splitAt).trim());
        remaining = remaining.substring(splitAt).trim();
      }
    }

    let lastMessageId: number | undefined = undefined;
    for (const [i, chunk] of chunks.entries()) {
      try {
        if (i === 0 && messageId) {
          // try editing the original message for the first chunk
          await this.bot.editMessageText(chunk, {
            chat_id: chatId,
            message_id: messageId,
          });
          lastMessageId = messageId;
          continue;
        }

        const newMessage = await this.bot.sendMessage(chatId, chunk);
        lastMessageId = newMessage.message_id;
      } catch (error) {
        console.error("Error sending message chunk:", error);
        // On failure, continue to try sending remaining chunks
      }
    }

    // If nothing was sent/edited, fallback to a safe truncated message
    if (!lastMessageId) {
      const truncated = text.substring(0, this.MAX_MESSAGE_LENGTH - 100) + "\n\n... [Message truncated due to length]";
      const fallbackMsg = await this.bot.sendMessage(chatId, truncated);
      return fallbackMsg.message_id;
    }

    return lastMessageId;
  }

  private async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from?.username || "unknown";
    const firstName = msg.from?.first_name || "unknown";
    const userId = msg.from?.id.toString() || `anonymous-${chatId}`;

    if (!text) {
      await this.bot.sendMessage(chatId, "Sorry, I can only process text messages.");
      return;
    }

    if (text.startsWith("/")) {
      const command = text.trim().split(" ")[0];

      switch (command) {
        case "/start":
          await this.bot.sendMessage(chatId, 
            `@BOTChainDeFAI_bot, a DeFi assistant for the BOT Chain testnet on Telegram.

    💼 You can:
    • Get test tokens
    • Send and receive USDT or BOT
    • Buy airtime
    • Check balances
    • More features coming soon...

Try a command:
👉 /faucet — Get test BOT

Need help?
👉 /help

`);
        return;

        case "/balance": {
          try {
            const { balanceCommand } = await import("../../commands/balanceCommand");
            await balanceCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /balance error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/help": {
          try {
            const { helpCommand } = await import("../../commands/help");
            await helpCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /help error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/mywallet": {
          try {
            const { myWalletCommand } = await import("../../commands/myWallet");
            await myWalletCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /mywallet error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/airtime": {
          try {
            const { airtimeCommand } = await import("../../commands/airtime");
            await airtimeCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /airtime error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/claim": {
          try {
            const { claimUSDTCommand1 } = await import("../../commands/claimForUSDT");
            await claimUSDTCommand1(this.bot, msg);
          } catch (err) {
            console.error("Command /claim error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/transferusdt": {
          try {
            const { transferUSDTCommand } = await import("../../commands/transferkUSDT");
            await transferUSDTCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /transferusdt error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/transferbot": {
          try {
            const { transferBOTCommand } = await import("../../commands/transferBOT");
            await transferBOTCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /transferbot error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/faucet": {
          try {
            const { faucetCommand } = await import("../../commands/faucet");
            await faucetCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /faucet error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        case "/swap":
        case "/airdrop": {
          await this.bot.sendMessage(chatId, "🚧 Coming soon. This feature is not available yet.");
          return;
        }

        case "/claimuser": {
          try {
            const { claimUSDTCommand } = await import("../../commands/claimUSDT");
            await claimUSDTCommand(this.bot, msg);
          } catch (err) {
            console.error("Command /claimuser error:", err);
            await this.bot.sendMessage(chatId, "❌ Internal server error. Please try again later.");
          }
          return;
        }

        default: {
          const fallbackReply = this.getFallbackReply(text);
          if (fallbackReply) {
            await this.bot.sendMessage(chatId, fallbackReply);
          } else {
            await this.bot.sendMessage(chatId, "I don’t support that command yet. Try /help or ask for balance, wallet, claim, faucet, airtime, or transfer.");
          }
          return;
        }
      }
    }

    const directIntent = detectDirectActionIntent(text);
    if (directIntent === "balance") {
      try {
        const { balanceCommand } = await import("../../commands/balanceCommand");
        await balanceCommand(this.bot, msg);
      } catch (err) {
        console.error("Direct balance handling error:", err);
        await this.bot.sendMessage(chatId, "❌ I couldn’t check your balance right now.");
      }
      return;
    }

    if (directIntent === "wallet") {
      try {
        const { myWalletCommand } = await import("../../commands/myWallet");
        await myWalletCommand(this.bot, msg);
      } catch (err) {
        console.error("Direct wallet handling error:", err);
        await this.bot.sendMessage(chatId, "❌ I couldn’t retrieve your wallet address right now.");
      }
      return;
    }

    if (directIntent === "claim") {
      try {
        const { claimUSDTCommand1 } = await import("../../commands/claimForUSDT");
        await claimUSDTCommand1(this.bot, msg);
      } catch (err) {
        console.error("Direct claim handling error:", err);
        await this.bot.sendMessage(chatId, "❌ I couldn’t process your claim right now.");
      }
      return;
    }

    if (directIntent === "faucet") {
      try {
        const { faucetCommand } = await import("../../commands/faucet");
        await faucetCommand(this.bot, msg);
      } catch (err) {
        console.error("Direct faucet handling error:", err);
        await this.bot.sendMessage(chatId, "❌ I couldn’t process your faucet request right now.");
      }
      return;
    }

    if (directIntent === "airtime") {
      try {
        const { airtimeCommand } = await import("../../commands/airtime");
        const rewrittenText = buildAirtimeCommandText(text) ?? text;
        const airtimeMessage = {
          ...msg,
          text: rewrittenText,
        } as TelegramBot.Message;
        await airtimeCommand(this.bot, airtimeMessage);
      } catch (err) {
        console.error("Direct airtime handling error:", err);
        await this.bot.sendMessage(chatId, "❌ I couldn’t process your airtime request right now.");
      }
      return;
    }

    if (directIntent === "transfer") {
      try {
        const rewrittenText = buildTransferCommandText(text) ?? text;
        const transferMessage = {
          ...msg,
          text: rewrittenText,
        } as TelegramBot.Message;

        if (rewrittenText.startsWith("/transferusdt")) {
          const { transferUSDTCommand } = await import("../../commands/transferkUSDT");
          await transferUSDTCommand(this.bot, transferMessage);
        } else if (rewrittenText.startsWith("/transferbot")) {
          const { transferBOTCommand } = await import("../../commands/transferBOT");
          await transferBOTCommand(this.bot, transferMessage);
        } else {
          await this.bot.sendMessage(chatId, "❌ I couldn’t parse that transfer request. Try: /transferusdt @username 10");
        }
      } catch (err) {
        console.error("Direct transfer handling error:", err);
        await this.bot.sendMessage(chatId, "❌ I couldn’t process your transfer request right now.");
      }
      return;
    }

    if (directIntent === "user-info") {
      const response = getSimpleUserInfoResponse(text, username !== "unknown" ? username : undefined, firstName !== "unknown" ? firstName : undefined);
      await this.bot.sendMessage(chatId, response);
      return;
    }

    const fallbackReply = this.getFallbackReply(text);
    if (fallbackReply) {
      await this.bot.sendMessage(chatId, fallbackReply);
      return;
    }

    // 🧠 AI Response (cleaned version)
    try {
      const sentMessage = await this.bot.sendMessage(chatId, "Thinking...");
      console.log(`[AI Request] User (${userId}): ${text}`);

      let finalResponse = "";
      let toolResultText = "";

      // Set user context for tools to access
      setUserContext(userId, username);

      const streamResult: any = await kaiaDeFAIAgent.stream(text, {
        threadId: `telegram-${chatId}`,
        resourceId: userId,
        context: [
          { role: "system", content: `User: ${firstName} (${username}), telegramId: ${userId}` },
        ],
      });

      // Diagnostic: log the shape so we can see what the agent returned at runtime
      try {
        console.log("AI streamResult type:", typeof streamResult, "keys:", streamResult && Object.keys(streamResult));
      } catch (e) {
        console.log("AI streamResult logging failed", e);
      }

      let processed = false;

      const processChunk = (chunk: any) => {
        switch (chunk.type) {
          case "text-delta":
            finalResponse += chunk.textDelta;
            break;

          case "tool-result":
            toolResultText = this.formatToolResult(chunk.result);
            console.log("Tool result:", chunk.result);
            break;

          case "error":
            finalResponse += `\n❌ ${String(chunk.error)}`;
            break;

          default:
            break;
        }
      };

      // Case A: direct web ReadableStream
      if (streamResult && typeof streamResult.getReader === "function") {
        const reader = streamResult.getReader();
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          processChunk(chunk);
        }
        processed = true;
      }

      // Case B: wrapped object { stream: ReadableStream }
      else if (streamResult?.stream && typeof streamResult.stream.getReader === "function") {
        const reader = streamResult.stream.getReader();
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          processChunk(chunk);
        }
        processed = true;
      }

      // Case B2: Mastra/DefaultStream result with `baseStream` property
      else if (streamResult?.baseStream && typeof streamResult.baseStream.getReader === "function") {
        const reader = streamResult.baseStream.getReader();
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          processChunk(chunk);
        }
        processed = true;
      }

      // Case C: async iterable (for-await-of)
      else if (streamResult && typeof streamResult[Symbol.asyncIterator] === "function") {
        for await (const chunk of streamResult) {
          processChunk(chunk);
        }
        processed = true;
      }

      // Case D: wrapped async iterable { stream: AsyncIterable }
      else if (streamResult?.stream && typeof streamResult.stream[Symbol.asyncIterator] === "function") {
        for await (const chunk of streamResult.stream) {
          processChunk(chunk);
        }
        processed = true;
      }

      // Case D2: Mastra/DefaultStream with async-iterable `baseStream`
      else if (streamResult?.baseStream && typeof streamResult.baseStream[Symbol.asyncIterator] === "function") {
        for await (const chunk of streamResult.baseStream) {
          processChunk(chunk);
        }
        processed = true;
      }

      if (!processed) {
        console.error("AI stream did not return a readable stream or async iterable:", streamResult);
        throw new Error("AI stream did not return a readable stream.");
      }

      let output = finalResponse.trim();
      if (toolResultText) {
        output += `\n\n✨ Result:\n\`\`\`\n${toolResultText}\n\`\`\``;
      }

      // Example: suggest /airtime command if relevant
      if (output.toLowerCase().includes("airtime")) {
        output += `\n\n${this.suggestCommand("/airtime 08012345678 1500 NGN")}`;
      }

      await this.updateOrSplitMessage(chatId, sentMessage.message_id, output);
      console.log("[AI Response] ✅ Sent.");
      clearUserContext();
    } catch (error) {
      console.error("Error processing message:", error);
      clearUserContext();
      await this.bot.sendMessage(
        chatId,
        "Sorry, I encountered an error processing your message. Please try again."
      );
    }
  }
}
