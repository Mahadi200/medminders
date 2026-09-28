import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Returns DATABASE_URL with a defensive connection limit for Supabase Session Pooler.
 * If connection_limit is not already configured, caps pool size to 3 for Render Free.
 */
function getDatasourceUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Strip surrounding quotes if present in .env
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }

  if (!url.includes('connection_limit=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}connection_limit=10`;
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const url = getDatasourceUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = global.__prismaClient || createPrismaClient();
global.__prismaClient = prisma;
