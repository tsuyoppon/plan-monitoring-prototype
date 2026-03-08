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
}) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  department: user.department,
  role: user.role,
  isActive: user.isActive,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['admin']);
  if (!session) {
    return;
  }

  const userId = Number(req.query.id);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  if (req.method === 'PUT') {
    try {
      const { displayName, department, role, isActive, password } = req.body ?? {};
      const data: {
        displayName?: string | null;
        department?: string | null;
        role?: AppRole;
        isActive?: boolean;
        passwordHash?: string;
      } = {};

      if (typeof displayName === 'string' || displayName === null) {
        data.displayName = displayName;
      }
      if (typeof department === 'string' || department === null) {
        data.department = department;
      }
      if (typeof isActive === 'boolean') {
        data.isActive = isActive;
      }
      if (typeof role === 'string' && isAppRole(role)) {
        data.role = role;
      }
      if (typeof password === 'string' && password.length > 0) {
        data.passwordHash = await bcrypt.hash(password, 12);
      }

      const updatedUser = await prisma.appUser.update({
        where: { id: userId },
        data,
      });

      res.status(200).json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      if (session.user.id === userId) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      await prisma.appUser.delete({ where: { id: userId } });
      res.status(204).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
    return;
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
