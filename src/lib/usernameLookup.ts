// src/lib/usernameLookup.ts
import { prisma } from "./prismaClient";

export async function getUsernameWallet(username: string) {
  return prisma.wallet.findUnique({
    where: { username },
  });
}
