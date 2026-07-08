import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL or TURSO_DATABASE_URL must be set");
}

let prisma: PrismaClient;

if (process.env.TURSO_DATABASE_URL) {
  const libsql = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  prisma = new PrismaClient({
    adapter: new PrismaLibSQL(libsql),
  });
} else {
  prisma = new PrismaClient();
}

export { prisma };
