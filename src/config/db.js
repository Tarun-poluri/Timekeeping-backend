import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
prisma
  .$connect()
  .then(() => console.log(":white_tick: Prisma connected to Supabase Postgres"))
  .catch((err) => console.error(":x: Prisma DB connection error:", err));
