import type { NextApiRequest, NextApiResponse } from 'next';

import { buildAccessLogWhere, parseAccessLogQuery } from '@/lib/accessLogQuery';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const parsePositiveInt = (value: string | string[] | undefined, fallback: number) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 50), 100);

    const [total, logs] = await Promise.all([
      prisma.accessLog.count({ where }),
      prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          emailSnapshot: true,
          displayNameSnapshot: true,
          roleSnapshot: true,
          method: true,
          path: true,
          routeType: true,
          statusCode: true,
          ipAddress: true,
          userAgent: true,
          referer: true,
          createdAt: true,
        },
      }),
    ]);

    res.status(200).json({
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
}
