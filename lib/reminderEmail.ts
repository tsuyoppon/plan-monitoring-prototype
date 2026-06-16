import type { Initiative, ProgressLog } from '@/generated/client/client';

export type ReminderEmailInput = {
  recipientName: string;
  recipientEmail: string;
  introText: string;
  closingText: string;
  initiative: Initiative & { progressLogs: ProgressLog[] };
};

export type ReminderEmailResult = {
  subject: string;
  body: string;
  provider: 'resend';
  providerMessageId: string | null;
};

type ResendSendEmailResponse = {
  id?: string;
  name?: string;
  message?: string;
};

const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails';

const formatDate = (value: Date | null) => {
  if (!value) return '未入力';
  return value.toISOString().slice(0, 10);
};

export const getReminderEmailSubject = (initiative: Pick<Initiative, 'measureName'>) => {
  return `【リマインド】${initiative.measureName}の最新進捗状況`;
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

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
};

export const sendReminderEmail = async (input: ReminderEmailInput): Promise<ReminderEmailResult> => {
  const apiKey = requireEnv('RESEND_API_KEY');
  const from = requireEnv('REMINDER_EMAIL_FROM');
  const replyTo = process.env.REMINDER_EMAIL_REPLY_TO?.trim();
  const subject = getReminderEmailSubject(input.initiative);
  const body = buildReminderEmailBody(input);

  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.recipientEmail],
      subject,
      text: body,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ResendSendEmailResponse;

  if (!response.ok) {
    throw new Error(payload.message || payload.name || `Resend email API failed: ${response.status}`);
  }

  return {
    subject,
    body,
    provider: 'resend',
    providerMessageId: payload.id ?? null,
  };
};
