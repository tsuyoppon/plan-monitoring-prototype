import type { Initiative, ProgressLog } from '@/generated/client/client';

export type ReminderEmailInput = {
  recipientName: string;
  recipientEmail: string;
  introText: string;
  closingText: string;
  initiative: Initiative & { progressLogs: ProgressLog[] };
};

const formatDate = (value: Date | null) => {
  if (!value) return '未入力';
  return value.toISOString().slice(0, 10);
};

export const buildReminderEmailBody = ({ recipientName, introText, closingText, initiative }: ReminderEmailInput) => {
  const latestProgress = initiative.progressLogs[0];
  const progressText = latestProgress
    ? [
        `年度/四半期: ${latestProgress.fiscalYear}年度 Q${latestProgress.fiscalQuarter}`,
        `進捗状況: ${latestProgress.progressStatus || '未入力'}`,
        `進捗評価: ${latestProgress.progressEvaluation || '未入力'}`,
        `次のアクション: ${latestProgress.nextAction || '未入力'}`,
        `入力者: ${latestProgress.inputBy || '未入力'}`,
        `入力日: ${formatDate(latestProgress.inputAt)}`,
      ].join('\n')
    : '最新の進捗状況は未登録です。';

  return [
    `${recipientName} 様`,
    '',
    introText.trim(),
    '',
    '【対象施策の最新進捗状況】',
    `施策名: ${initiative.measureName}`,
    `領域: ${initiative.domain}`,
    `担当部署: ${initiative.department || '未入力'}`,
    progressText,
    '',
    closingText.trim(),
  ].join('\n');
};

export const sendReminderEmail = async (input: ReminderEmailInput) => {
  const subject = `【リマインド】${input.initiative.measureName}の最新進捗状況`;
  const body = buildReminderEmailBody(input);

  if (process.env.REMINDER_EMAIL_WEBHOOK_URL) {
    const response = await fetch(process.env.REMINDER_EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: input.recipientEmail, subject, text: body }),
    });

    if (!response.ok) {
      throw new Error(`Reminder email webhook failed: ${response.status}`);
    }
  } else {
    console.info('Reminder email webhook is not configured. Email payload:', {
      to: input.recipientEmail,
      subject,
      text: body,
    });
  }

  return { subject, body };
};
