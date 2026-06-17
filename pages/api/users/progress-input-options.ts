import type { NextApiRequest, NextApiResponse } from 'next';

import { withAccessLogging } from '@/lib/accessLogging';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ProgressInputUserOption } from '@/types';

const toDisplayNameOption = (user: { id: number; displayName: string | null }): ProgressInputUserOption | null => {
  const displayName = user.displayName?.trim();

  if (!displayName) {
    return null;
  }

  return {
    id: user.id,
    displayName,
  };
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['editor', 'admin']);
  if (!session) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    if (session.user.role !== 'admin') {
      const option = toDisplayNameOption({
        id: session.user.id,
        displayName: session.user.displayName ?? null,
      });

      res.status(200).json(option ? [option] : []);
      return;
    }

    const users = await prisma.appUser.findMany({
      where: {
        isActive: true,
        displayName: {
          not: null,
        },
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        displayName: true,
      },
    });

    res.status(200).json(users.map(toDisplayNameOption).filter((user): user is ProgressInputUserOption => Boolean(user)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch progress input users' });
  }
}

export default withAccessLogging(handler);
