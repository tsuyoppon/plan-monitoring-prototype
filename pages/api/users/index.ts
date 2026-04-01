import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { AppRole, isAppRole } from '@/types/auth';

const sanitizeUser = (user: {
  id: number;
  email: string;
  displayName: string | null;
  department: string | null;
  role: string;
  isActive: boolean;
  passwordHash: string | null;
}) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  department: user.department,
  role: user.role,
  isActive: user.isActive,
  hasPassword: Boolean(user.passwordHash),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['admin']);
  if (!session) {
    return;
  }

  if (req.method === 'GET') {
    try {
      const users = await prisma.appUser.findMany({
        orderBy: { id: 'asc' },
      });

      res.status(200).json(users.map(sanitizeUser));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { email, password, displayName, department, role } = req.body ?? {};

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const normalizedRole: AppRole = isAppRole(role) ? role : 'viewer';
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.appUser.create({
        data: {
          email,
          passwordHash,
          displayName: typeof displayName === 'string' ? displayName : null,
          department: typeof department === 'string' ? department : null,
          role: normalizedRole,
          isActive: true,
        },
      });

      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create user' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
