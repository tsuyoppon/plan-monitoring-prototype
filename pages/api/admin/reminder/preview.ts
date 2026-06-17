import type { NextApiRequest, NextApiResponse } from 'next';

import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  parseReminderInitiativeIds,
  prepareReminderEmail,
  ReminderEmailValidationError,
} from '@/lib/reminderEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['admin']);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const userId = Number(req.body?.userId);
  const initiativeIds = parseReminderInitiativeIds(req.body?.initiativeIds ?? req.body?.initiativeId);
  if (!Number.isInteger(userId) || !initiativeIds) {
    res.status(400).json({ error: '送付先ユーザーと対象施策を選択してください。' });
    return;
  }

  try {
    const { emailInput, subject, body } = await prepareReminderEmail({
      prisma,
      userId,
      initiativeIds,
      missingSettingsMessage: 'リマインドメール設定を保存してからプレビューしてください。',
    });

    res.status(200).json({
      subject,
      body,
      recipientName: emailInput.recipientName,
      recipientEmail: emailInput.recipientEmail,
      initiativeCount: emailInput.initiatives.length,
    });
  } catch (error) {
    if (error instanceof ReminderEmailValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'リマインドメールプレビューの取得に失敗しました。' });
  }
}
