import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/authOptions';
import { AppRole } from '@/types/auth';

export const getApiSession = async (req: NextApiRequest, res: NextApiResponse) => {
  return getServerSession(req, res, authOptions);
};

export const requireAuth = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getApiSession(req, res);

  if (!session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return session;
};

export const requireRole = async (
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: AppRole[]
) => {
  const session = await requireAuth(req, res);

  if (!session) {
    return null;
  }

  if (!allowedRoles.includes(session.user.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return session;
};
