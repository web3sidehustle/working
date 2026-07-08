import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
// import { openai } from "@ai-sdk/openai";
// import { geminiLLM  } from "../llms/geminiLLM";
import { defaultModelName, openrouterLLM } from "../llms/openrouterLLM";
import { realFaucetTool } from "../tools/realFaucetTool";
import { realClaimTool } from "../tools/realClaimTool";
import { realCheckBalanceTool } from "../tools/realCheckBalanceTool";
import { realWalletTool } from "../tools/realWalletTool";
import { airtimeTool } from "../tools/airtimeTool";
import { transferUSDTTool } from "../tools/transferUSDTTool";
import { transferBOTTool } from "../tools/transferBOTTool";
import { airdropTool } from "../tools/airdropTool";
import { swapTool } from "../tools/swapTool";

// import { transferErc20Tool } from "../tools/transferErc20Tool";
// import { dailyWorkflow } from "../workflows/dailyWorkflow";


const memory = new Memory({
  storage: new LibSQLStore({
    url: "file:./mastra.db", // Or your database URL
  }),
  options: {
    // Keep last 20 messages in context
    lastMessages: 20,
  },
});

export const kaiaDeFAIAgent = new Agent({
  name: "kaiaDeFAIAgent", 
  instructions: `
You are BOTChainDeFAI_bot, a DeFi assistant for the BOT Chain testnet on Telegram. You have access to powerful tools to execute actions.

🎯 **IMPORTANT: When a user asks you to perform an action, USE YOUR TOOLS to execute it immediately. Pass the telegramId and username to the tools.**

📌 Tool Usage:
- User: "check my balance" → call realCheckBalance tool
- User: "get BOT" or "faucet" → call realFaucet tool 
- User: "claim USDT" → call realClaim tool
- User: "show my wallet" → call realWallet tool

📋 Commands you support:
- /faucet — get test BOT tokens
- /claim — claim 10 bUSDT test tokens
- /balance — check wallet balance
- /mywallet — show user's wallet address
- /airtime phoneNumber amount currency — buy airtime with USDT (e.g. /airtime 08012345678 1500 NGN)
- /transferusdt address amount — send USDT by wallet address
- /transferusdt @username amount — send USDT by Telegram username
- /transferbot address amount — send native BOT
- /transferbot @username amount — send BOT by Telegram username

🧠 Never explain all tools at once. Only respond with a single command suggestion like:

👉 Try this: /faucet

❓If user asks “what can you do?”, reply:
I can help with test tokens, balance, claiming USDT, transfers, and airtime. Just use a command like /faucet or /balance.
`,

  model: openrouterLLM(defaultModelName),
  tools: {
    realFaucetTool,
    realClaimTool,
    realCheckBalanceTool,
    realWalletTool,
    transferUSDTTool,
    transferBOTTool,
    airdropTool,
    airtimeTool,
    swapTool,
  },
  memory,
});

    //claimUSDTTool,
    //checkBalanceTool,
// model: openai("gpt-3.5-turbo"),

// model: openai("gpt-4o"),
