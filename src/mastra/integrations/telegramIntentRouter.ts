export type DirectActionIntent = "balance" | "wallet" | "faucet" | "claim" | "airtime" | "transfer" | "user-info" | "none";

const balancePatterns = [
  /\bbalance\b/i,
  /\bcheck\b.*\bbalance\b/i,
  /\bwhat'?s?\b.*\bbalance\b/i,
  /\bshow\b.*\bbalance\b/i,
  /\bmy\b.*\bbalance\b/i,
];

const walletPatterns = [
  /\bwallet\b/i,
  /\baddress\b/i,
  /\bshow\b.*\bwallet\b/i,
  /\bmy\b.*\bwallet\b/i,
];

const faucetPatterns = [/\bfaucet\b/i, /\bget\b.*\bbot\b/i, /\brequest\b.*\bbot\b/i];
const claimPatterns = [/\bclaim\b/i, /\bclaim\b.*\busdt\b/i];
const airtimePatterns = [
  /\bairtime\b/i,
  /\btop\s+up\b/i,
  /\btopup\b/i,
  /\bbuy\s+airtime\b/i,
  /\bairtime\s+top\s+up\b/i,
];
const transferPatterns = [/\btransfer\b/i, /\bsend\b/i, /\bpay\b/i, /\bmake\s+payment\b/i];

export function detectDirectActionIntent(text: string): DirectActionIntent {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "none";

  if (/\b(username|user info|name|who am i|my details|my info)\b/i.test(normalized)) return "user-info";
  if (balancePatterns.some((pattern) => pattern.test(normalized))) return "balance";
  if (walletPatterns.some((pattern) => pattern.test(normalized))) return "wallet";
  if (faucetPatterns.some((pattern) => pattern.test(normalized))) return "faucet";
  if (claimPatterns.some((pattern) => pattern.test(normalized))) return "claim";
  if (airtimePatterns.some((pattern) => pattern.test(normalized))) return "airtime";
  if (transferPatterns.some((pattern) => pattern.test(normalized))) return "transfer";
  return "none";
}

export function getSimpleUserInfoResponse(text: string, username?: string, firstName?: string): string {
  const normalized = text.trim().toLowerCase();
  if (/username/.test(normalized)) {
    if (username) return `Your Telegram username is @${username}.`;
    return "I can’t see a Telegram username for you right now.";
  }

  if (/name/.test(normalized) || /who am i/.test(normalized)) {
    if (firstName) return `Your name is ${firstName}.`;
    return "I can’t see a Telegram name for you right now.";
  }

  return "I can’t see a Telegram username or name for you right now.";
}

export function buildAirtimeCommandText(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const match = normalized.match(/(?:^|\s)(?:\/)?(?:airtime|top\s+up)(?:\s+|$)(.+)$/i);
  if (!match) return null;

  const parts = match[1].trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const [phone, amount, countryCode] = parts;
  if (!/^\+?\d{7,15}$/.test(phone.replace(/\D/g, ""))) return null;
  if (!/^\d+$/.test(amount)) return null;
  if (!/^[a-z]{1,4}$/i.test(countryCode)) return null;

  return `/airtime ${phone} ${amount} ${countryCode}`;
}

export function buildTransferCommandText(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const transferMatch = normalized.match(/(?:send|transfer)\s+(\d+(?:\.\d+)?)\s+(usdt|bot)\s+(?:to\s+)?(@?[a-z0-9_]+|0x[a-fA-F0-9]{40})/i);
  if (!transferMatch) return null;

  const [, amount, asset, recipient] = transferMatch;
  const command = asset.toLowerCase() === "usdt" ? "/transferusdt" : "/transferbot";
  return `${command} ${recipient} ${amount}`;
}
