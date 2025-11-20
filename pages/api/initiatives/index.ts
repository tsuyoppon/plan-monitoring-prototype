import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@/generated/client/client';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { domain, department, measureName, status } = req.query;

      const where: Prisma.InitiativeWhereInput = {};

      if (domain) {
        where.domain = { contains: domain as string, mode: 'insensitive' };
      }
      if (department) {
        where.department = { contains: department as string, mode: 'insensitive' };
      }
      if (measureName) {
        where.measureName = { contains: measureName as string, mode: 'insensitive' };
      }
      if (status) {
        where.progressLogs = {
          some: {
            isLatest: true,
            progressStatus: status as string,
          },
        };
      }

      const initiatives = await prisma.initiative.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          progressLogs: {
            where: { isLatest: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      res.status(200).json(initiatives);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch initiatives' });
    }
  } else if (req.method === 'POST') {
    try {
      const { domain, measureName, detail, goal, kpi, startDate, endDate, department, scheduleText } = req.body;
      const initiative = await prisma.initiative.create({
        data: {
          domain,
          measureName,
          detail,
          goal,
          kpi,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          department,
          scheduleText,
        },
      });
      res.status(201).json(initiative);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create initiative' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
