import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
