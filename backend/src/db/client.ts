import { PrismaClient } from '@prisma/client';
import { config } from '../config';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: config.server.isDev ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.server.isDev) {
  global.prisma = prisma;
}

export default prisma;
