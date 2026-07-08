import test from "node:test";
import assert from "node:assert/strict";
import { detectDirectActionIntent, getSimpleUserInfoResponse } from "./telegramIntentRouter";

test("detects balance intent from natural language", () => {
  assert.equal(detectDirectActionIntent("check my balance"), "balance");
  assert.equal(detectDirectActionIntent("what is my balance"), "balance");
  assert.equal(detectDirectActionIntent("show my wallet"), "wallet");
});

test("returns a direct reply for username and name questions", () => {
  assert.equal(getSimpleUserInfoResponse("what is my username", "botuser", "Alice"), "Your Telegram username is @botuser.");
  assert.equal(getSimpleUserInfoResponse("what is my name", undefined, "Alice"), "Your name is Alice.");
  assert.equal(getSimpleUserInfoResponse("who am i", undefined, undefined), "I can’t see a Telegram username or name for you right now.");
});
