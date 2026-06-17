import type { NextApiRequest, NextApiResponse } from 'next';

import { withAccessLogging } from '@/lib/accessLogging';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  parseReminderInitiativeIds,
  prepareReminderEmail,
  ReminderEmailValidationError,
  sendReminderEmail,
} from '@/lib/reminderEmail';

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'リマインドメール送信に失敗しました。';
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const { user, selectedInitiatives, emailInput, subject, body } = await prepareReminderEmail({
      prisma,
      userId,
      initiativeIds,
      missingSettingsMessage: 'リマインドメール設定を保存してから送信してください。',
    });

    try {
      const sent = await sendReminderEmail(emailInput);
      const reminders = await prisma.reminderEmailLog.createManyAndReturn({
        data: selectedInitiatives.map((initiative) => ({
          userId: user.id,
          initiativeId: initiative.id,
          recipientEmail: user.email,
          recipientName: emailInput.recipientName,
          subject: sent.subject,
          body: sent.body,
          sentByUserId: session.user.id,
          status: 'sent',
          provider: sent.provider,
          providerMessageId: sent.providerMessageId,
          errorMessage: null,
        })),
      });

      res.status(200).json({ reminders });
    } catch (sendError) {
      const errorMessage = getErrorMessage(sendError);
      await prisma.reminderEmailLog.createMany({
        data: selectedInitiatives.map((initiative) => ({
          userId: user.id,
          initiativeId: initiative.id,
          recipientEmail: user.email,
          recipientName: emailInput.recipientName,
          subject,
          body,
          sentByUserId: session.user.id,
          status: 'failed',
          provider: 'resend',
          errorMessage,
        })),
      });

      res.status(502).json({ error: `リマインドメール送信に失敗しました: ${errorMessage}` });
    }
  } catch (error) {
    if (error instanceof ReminderEmailValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'リマインドメール送信に失敗しました。' });
  }
}

export default withAccessLogging(handler);
