import type { NextApiRequest, NextApiResponse } from 'next';

import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildReminderEmailBody, getReminderEmailSubject, sendReminderEmail } from '@/lib/reminderEmail';

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'リマインドメール送信に失敗しました。';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['admin']);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const userId = Number(req.body?.userId);
  const initiativeId = Number(req.body?.initiativeId);
  if (!Number.isInteger(userId) || !Number.isInteger(initiativeId)) {
    res.status(400).json({ error: '送付先ユーザーと対象施策を選択してください。' });
    return;
  }

  try {
    const [user, initiative, settings] = await Promise.all([
      prisma.appUser.findUnique({ where: { id: userId } }),
      prisma.initiative.findUnique({
        where: { id: initiativeId },
        include: {
          progressLogs: {
            where: { isLatest: true },
            orderBy: [{ fiscalYear: 'desc' }, { fiscalQuarter: 'desc' }, { versionNo: 'desc' }],
            take: 1,
          },
        },
      }),
      prisma.reminderEmailSetting.findFirst({ orderBy: { id: 'asc' } }),
    ]);

    if (!user || !user.isActive) {
      res.status(404).json({ error: '有効な送付先ユーザーが見つかりません。' });
      return;
    }
    if (!initiative || !initiative.isActive) {
      res.status(404).json({ error: '有効な対象施策が見つかりません。' });
      return;
    }
    if (!settings) {
      res.status(400).json({ error: 'リマインドメール設定を保存してから送信してください。' });
      return;
    }

    const recipientName = user.displayName || user.email;
    const emailInput = {
      recipientName,
      recipientEmail: user.email,
      introText: settings.introText,
      closingText: settings.closingText,
      initiative,
    };
    const subject = getReminderEmailSubject(initiative);
    const body = buildReminderEmailBody(emailInput);

    try {
      const sent = await sendReminderEmail(emailInput);
      const reminder = await prisma.reminderEmailLog.create({
        data: {
          userId: user.id,
          initiativeId: initiative.id,
          recipientEmail: user.email,
          recipientName,
          subject: sent.subject,
          body: sent.body,
          sentByUserId: session.user.id,
          status: 'sent',
          provider: sent.provider,
          providerMessageId: sent.providerMessageId,
          errorMessage: null,
        },
      });

      res.status(200).json({ reminder });
    } catch (sendError) {
      const errorMessage = getErrorMessage(sendError);
      await prisma.reminderEmailLog.create({
        data: {
          userId: user.id,
          initiativeId: initiative.id,
          recipientEmail: user.email,
          recipientName,
          subject,
          body,
          sentByUserId: session.user.id,
          status: 'failed',
          provider: 'resend',
          errorMessage,
        },
      });

      res.status(502).json({ error: `リマインドメール送信に失敗しました: ${errorMessage}` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'リマインドメール送信に失敗しました。' });
  }
}
