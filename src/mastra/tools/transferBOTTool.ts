// src/mastra/tools/transferBOTTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const transferBOTTool = createTool({
  id: "transferBOT",
  description: "Suggests how to transfer native BOT using Telegram bot commands.",
  inputSchema: z.object({
    receiverAddress: z.string().optional().describe("BOT Chain wallet address"),
    username: z.string().optional().describe("Telegram username of recipient"),
    amount: z.number().optional().describe("Amount of BOT to transfer"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested Telegram bot command"),
  }),
  execute: async ({ context }) => {
    const { receiverAddress, username, amount } = context;

    const amt = amount || 1;
    const byAddress = receiverAddress
      ? `/transferbot ${receiverAddress} ${amt}`
      : null;

    const byUsername = username
      ? `/transferbot @${username} ${amt}`
      : null;

    const message = [byUsername, byAddress]
      .filter(Boolean)
      .map(cmd => `🚀 Tap or send: \`${cmd}\``)
      .join("\n") ||
      `To transfer BOT, send one of the following commands:\n` +
      `\`/transferbot 0xWalletAddress amount\`\n` +
      `or\n\`/transferbot @username amount\``;

    return { message };
  },
});
