import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@/generated/client/client';

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

  const userId = Number(req.query.id);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  if (req.method === 'PUT') {
    try {
      const { email, displayName, department, role, isActive, password } = req.body ?? {};
      const data: {
        email?: string;
        displayName?: string | null;
        department?: string | null;
        role?: AppRole;
        isActive?: boolean;
        passwordHash?: string;
      } = {};

      if (typeof email === 'string') {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
          res.status(400).json({ error: 'Email is required' });
          return;
        }
        data.email = trimmedEmail;
      }

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
        if (password.length < 8) {
          res.status(400).json({ error: 'Password must be at least 8 characters' });
          return;
        }
        data.passwordHash = await bcrypt.hash(password, 12);
      }

      if (session.user.id === userId) {
        if (data.isActive === false) {
          res.status(400).json({ error: 'Cannot deactivate your own account' });
          return;
        }
        if (data.role && data.role !== 'admin') {
          res.status(400).json({ error: 'Cannot change your own role from admin' });
          return;
        }
      }

      const updatedUser = await prisma.appUser.update({
        where: { id: userId },
        data,
      });

      res.status(200).json(sanitizeUser(updatedUser));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
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
