import type { NextApiRequest } from 'next';
import { Prisma } from '@/generated/client/client';

export type AccessLogQuery = {
  from: Date;
  to: Date;
  userId?: number;
  routeType?: 'page' | 'api';
  path?: string;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDate = (value: string | string[] | undefined) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseIntQuery = (value: string | string[] | undefined) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const parseAccessLogQuery = (req: NextApiRequest): AccessLogQuery => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);

  const from = parseDate(req.query.from) ?? defaultFrom;
  const to = parseDate(req.query.to) ?? now;
  const userId = parseIntQuery(req.query.userId);
  const routeType = req.query.routeType === 'page' || req.query.routeType === 'api' ? req.query.routeType : undefined;
  const path = typeof req.query.path === 'string' && req.query.path.trim() ? req.query.path.trim() : undefined;

  return {
    from: startOfDay(from),
    to: endOfDay(to),
    userId: userId ?? undefined,
    routeType,
    path,
  };
};

export const buildAccessLogWhere = (query: AccessLogQuery): Prisma.AccessLogWhereInput => ({
  createdAt: {
    gte: query.from,
    lte: query.to,
  },
  ...(query.userId ? { userId: query.userId } : {}),
  ...(query.routeType ? { routeType: query.routeType } : {}),
  ...(query.path
    ? {
        path: {
          contains: query.path,
          mode: 'insensitive',
        },
      }
    : {}),
});
