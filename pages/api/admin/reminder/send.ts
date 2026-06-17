import type { NextApiRequest, NextApiResponse } from 'next';

import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildReminderEmailBody, getReminderEmailSubject, sendReminderEmail } from '@/lib/reminderEmail';

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'リマインドメール送信に失敗しました。';
};

const parseInitiativeIds = (value: unknown) => {
  const rawIds = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const ids = rawIds.map((id) => Number(id));

  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id))) {
    return null;
  }

  return Array.from(new Set(ids));
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
  const initiativeIds = parseInitiativeIds(req.body?.initiativeIds ?? req.body?.initiativeId);
  if (!Number.isInteger(userId) || !initiativeIds) {
    res.status(400).json({ error: '送付先ユーザーと対象施策を選択してください。' });
    return;
  }

  try {
    const [user, initiatives, settings] = await Promise.all([
      prisma.appUser.findUnique({ where: { id: userId } }),
      prisma.initiative.findMany({
        where: { id: { in: initiativeIds } },
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

    const initiativesById = new Map(initiatives.map((initiative) => [initiative.id, initiative]));
    const selectedInitiatives = initiativeIds.flatMap((id) => {
      const initiative = initiativesById.get(id);
      return initiative ? [initiative] : [];
    });

    if (selectedInitiatives.length !== initiativeIds.length || selectedInitiatives.some((initiative) => !initiative.isActive)) {
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
      initiatives: selectedInitiatives,
    };
    const subject = getReminderEmailSubject(selectedInitiatives);
    const body = buildReminderEmailBody(emailInput);

    try {
      const sent = await sendReminderEmail(emailInput);
      const reminders = await prisma.reminderEmailLog.createManyAndReturn({
        data: selectedInitiatives.map((initiative) => ({
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
          recipientName,
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
    console.error(error);
    res.status(500).json({ error: 'リマインドメール送信に失敗しました。' });
  }
}
