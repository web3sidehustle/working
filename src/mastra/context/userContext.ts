// src/mastra/context/userContext.ts
// Global context to store current user info for tool access

let currentUserContext: {
  telegramId?: string;
  username?: string;
} = {};

export function setUserContext(telegramId: string, username?: string) {
  currentUserContext = { telegramId, username };
}

export function getUserContext() {
  return currentUserContext;
}

export function clearUserContext() {
  currentUserContext = {};
}
