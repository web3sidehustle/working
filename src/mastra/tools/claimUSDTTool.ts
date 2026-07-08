// src/mastra/tools/claimUSDTTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";
import { botChainExplorerUrl } from "../../lib/botChainConfig";
import { sendUSDT } from "../../lib/sendUSDT";

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
if (!PRIVATE_KEY) {
  throw new Error("Missing WALLET_PRIVATE_KEY in environment variables.");
}

const CLAIM_AMOUNT = 10; // 10 bUSDT per claim

export const claimUSDTTool = createTool({
  id: "claimUSDT",
  description: "Claim 10 bUSDT from the testnet faucet (owner transfers to user)",
  inputSchema: z.object({
    address: z.string().describe("User wallet address to receive tokens"),
  }),
  outputSchema: z.object({
    message: z.string(),
    transactionHash: z.string(),
    explorerUrl: z.string(),
  }),
  execute: async ({ context }) => {
    const userAddress = context.address as `0x${string}`;

    try {
      const txHash = await sendUSDT({
        fromPrivateKey: PRIVATE_KEY,
        toAddress: userAddress,
        amount: CLAIM_AMOUNT,
      });

      return {
        message: `✅ Successfully claimed ${CLAIM_AMOUNT} bUSDT for ${userAddress} from the treasury owner wallet`,
        transactionHash: txHash,
        explorerUrl: `${botChainExplorerUrl}/tx/${txHash}`,
      };
    } catch (error) {
      throw new Error(`Failed to claim bUSDT: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
