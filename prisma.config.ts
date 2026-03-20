import { defineConfig } from "prisma/config";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_PUBLIC_URL or DATABASE_URL must be set for Prisma.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
