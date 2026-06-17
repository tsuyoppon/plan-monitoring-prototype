import type { NextApiRequest, NextApiResponse } from 'next';

import { buildAccessLogWhere, parseAccessLogQuery } from '@/lib/accessLogQuery';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const buildDailyBuckets = (from: Date, to: Date) => {
  const buckets: Record<string, { date: string; total: number; page: number; api: number; errors: number }> = {};
  const cursor = new Date(from);

  while (cursor <= to) {
    const key = toDateKey(cursor);
    buckets[key] = { date: key, total: 0, page: 0, api: 0, errors: 0 };
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['admin']);
  if (!session) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const query = parseAccessLogQuery(req);
    const where = buildAccessLogWhere(query);

    const [
      totalAccesses,
      activeUserRows,
      apiErrors,
      latestLog,
      routeTypeGroups,
      pathGroups,
      userGroups,
      dailySourceLogs,
      userOptions,
    ] = await Promise.all([
      prisma.accessLog.count({ where }),
      prisma.accessLog.findMany({
        where: { ...where, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.accessLog.count({
        where: {
          ...where,
          routeType: 'api',
          statusCode: { gte: 400 },
        },
      }),
      prisma.accessLog.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.accessLog.groupBy({
        by: ['routeType'],
        where,
        _count: { _all: true },
      }),
      prisma.accessLog.groupBy({
        by: ['path'],
        where,
        _count: { _all: true },
      }),
      prisma.accessLog.groupBy({
        by: ['userId', 'emailSnapshot', 'displayNameSnapshot', 'roleSnapshot'],
        where,
        _count: { _all: true },
      }),
      prisma.accessLog.findMany({
        where,
        select: { createdAt: true, routeType: true, statusCode: true },
        orderBy: { createdAt: 'asc' },
        take: 10000,
      }),
      prisma.appUser.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, email: true, displayName: true, role: true, isActive: true },
      }),
    ]);

    const dailyBuckets = buildDailyBuckets(query.from, query.to);
    dailySourceLogs.forEach((log) => {
      const key = toDateKey(log.createdAt);
      if (!dailyBuckets[key]) {
        dailyBuckets[key] = { date: key, total: 0, page: 0, api: 0, errors: 0 };
      }
      dailyBuckets[key].total += 1;
      if (log.routeType === 'page') {
        dailyBuckets[key].page += 1;
      }
      if (log.routeType === 'api') {
        dailyBuckets[key].api += 1;
      }
      if (log.routeType === 'api' && log.statusCode && log.statusCode >= 400) {
        dailyBuckets[key].errors += 1;
      }
    });

    const routeTypeCounts = routeTypeGroups.map((group) => ({
      routeType: group.routeType,
      count: group._count._all,
    }));

    const topPaths = pathGroups
      .map((group) => ({ path: group.path, count: group._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = userGroups
      .map((group) => ({
        userId: group.userId,
        email: group.emailSnapshot,
        displayName: group.displayNameSnapshot,
        role: group.roleSnapshot,
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.status(200).json({
      filters: {
        from: toDateKey(query.from),
        to: toDateKey(query.to),
        userId: query.userId ?? null,
        routeType: query.routeType ?? '',
        path: query.path ?? '',
      },
      kpis: {
        totalAccesses,
        activeUsers: activeUserRows.length,
        apiErrors,
        latestAccessAt: latestLog?.createdAt.toISOString() ?? null,
      },
      dailyAccesses: Object.values(dailyBuckets),
      routeTypeCounts,
      topPaths,
      topUsers,
      userOptions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch access summary' });
  }
}
