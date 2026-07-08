// src/mastra/tools/swapTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const swapTool = createTool({
  id: "swapTool",
  description: "Swap one token for another via BOT Chain DEX or aggregator. (Coming soon)",
  inputSchema: z.object({
    amount: z.string(),
    fromToken: z.string(),
    toToken: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { amount, fromToken, toToken } = context;

    return {
      message: `To swap tokens, type:\n✅ /swap ${amount} ${fromToken} ${toToken}\n\n(Note: Swaps are coming soon! 🚧)`,
    };
  },
});
