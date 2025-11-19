import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const initiativeId = parseInt(id as string);

  if (isNaN(initiativeId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'GET') {
    try {
      const initiative = await prisma.initiative.findUnique({
        where: { id: initiativeId },
        include: {
          progressLogs: {
            where: { isLatest: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      if (!initiative) {
        return res.status(404).json({ error: 'Initiative not found' });
      }
      res.status(200).json(initiative);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch initiative' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { domain, measureName, isActive, detail, goal, kpi, startDate, endDate, department, scheduleText } = req.body;
      const initiative = await prisma.initiative.update({
        where: { id: initiativeId },
        data: {
          domain,
          measureName,
          isActive,
          detail,
          goal,
          kpi,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          department,
          scheduleText,
        },
      });
      res.status(200).json(initiative);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update initiative' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
