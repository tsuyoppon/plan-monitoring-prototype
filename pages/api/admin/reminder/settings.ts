import type { NextApiRequest, NextApiResponse } from 'next';

import { withAccessLogging } from '@/lib/accessLogging';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const DEFAULT_INTRO_TEXT = '以下の施策について、最新の進捗状況をお知らせします。内容をご確認ください。';
const DEFAULT_CLOSING_TEXT = '以上、よろしくお願いいたします。\nお問い合わせ先: monitoring@example.com';
const DEFAULT_SUBJECT = '【リマインド】施策の最新進捗状況';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireRole(req, res, ['admin']);
  if (!session) return;

  if (req.method === 'GET') {
    const settings = await prisma.reminderEmailSetting.findFirst({ orderBy: { id: 'asc' } });
    res.status(200).json(settings ?? { subject: DEFAULT_SUBJECT, introText: DEFAULT_INTRO_TEXT, closingText: DEFAULT_CLOSING_TEXT });
    return;
  }

  if (req.method === 'PUT') {
    const { subject, introText, closingText } = req.body ?? {};
    if (
      typeof subject !== 'string' ||
      typeof introText !== 'string' ||
      typeof closingText !== 'string' ||
      !subject.trim() ||
      !introText.trim() ||
      !closingText.trim()
    ) {
      res.status(400).json({ error: 'メールタイトル、案内文、末尾文は必須です。' });
      return;
    }

    const data = { subject: subject.trim(), introText: introText.trim(), closingText: closingText.trim() };
    const existing = await prisma.reminderEmailSetting.findFirst({ orderBy: { id: 'asc' } });
    const settings = existing
      ? await prisma.reminderEmailSetting.update({ where: { id: existing.id }, data })
      : await prisma.reminderEmailSetting.create({ data });

    res.status(200).json(settings);
    return;
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withAccessLogging(handler);
