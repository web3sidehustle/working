import { PrismaClient } from "@prisma/client";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // Must be 64 hex chars
const IV_LENGTH = 16;

// Validate encryption key at startup
function validateEncryptionKey() {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${ENCRYPTION_KEY.length} characters`
    );
  }
  try {
    Buffer.from(ENCRYPTION_KEY, "hex");
  } catch (e) {
    throw new Error("ENCRYPTION_KEY must be valid hex string");
  }
}

// Validate on module load
validateEncryptionKey();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(encryptedData: string): string {
  try {
    if (!encryptedData || typeof encryptedData !== "string") {
      throw new Error("Invalid encrypted data format");
    }

    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format: expected iv:encrypted");
    }

    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Decryption failed:", message);
    throw new Error(
      `Failed to decrypt private key: ${message}. ` +
        "This likely means the ENCRYPTION_KEY has changed or the data is corrupted. " +
        "Please ensure ENCRYPTION_KEY environment variable is correct."
    );
  }
}

export async function getOrCreateWallet(telegramId: string, username?: string) {
  let wallet = await prisma.wallet.findUnique({ where: { telegramId } });

  if (!wallet) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    wallet = await prisma.wallet.create({
      data: {
        telegramId,
        username,
        address: account.address,
        privateKey: encrypt(privateKey),
      },
    });
  } else if (username && wallet.username !== username) {
    // Update username if changed
    wallet = await prisma.wallet.update({
      where: { telegramId },
      data: { username },
    });
  }

  let decryptedPrivateKey: string;
  try {
    decryptedPrivateKey = decrypt(wallet.privateKey);
  } catch (error) {
    console.error("Decryption failed for wallet:", telegramId, error);
    // If decryption fails, generate a new wallet
    console.warn(
      "Generating new wallet due to decryption failure. " +
        "This may happen if ENCRYPTION_KEY changed."
    );
    const newPrivateKey = generatePrivateKey();
    const newAccount = privateKeyToAccount(newPrivateKey);
    const encryptedNewKey = encrypt(newPrivateKey);

    wallet = await prisma.wallet.update({
      where: { telegramId },
      data: {
        address: newAccount.address,
        privateKey: encryptedNewKey,
      },
    });

    decryptedPrivateKey = newPrivateKey;
  }

  return {
    address: wallet.address,
    privateKey: decryptedPrivateKey,
  };
}