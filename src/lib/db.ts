import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __prisma?: PrismaClient };
  if (!g.__prisma) {
    g.__prisma = new PrismaClient();
  }
  prisma = g.__prisma;
} else {
  prisma = new PrismaClient();
}

export { prisma };