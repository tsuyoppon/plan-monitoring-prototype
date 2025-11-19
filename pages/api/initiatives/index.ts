import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const initiatives = await prisma.initiative.findMany({
        orderBy: { createdAt: 'desc' },
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
