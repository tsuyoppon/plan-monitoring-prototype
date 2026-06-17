import type { Initiative, PrismaClient, ProgressLog } from '@/generated/client/client';

export type ReminderEmailInput = {
  recipientName: string;
  recipientEmail: string;
  introText: string;
  closingText: string;
  initiatives: Array<Initiative & { progressLogs: ProgressLog[] }>;
};

export type ReminderEmailResult = {
  subject: string;
  body: string;
  provider: 'resend';
  providerMessageId: string | null;
};

export type PreparedReminderEmail = {
  user: {
    id: number;
    email: string;
    displayName: string | null;
  };
  selectedInitiatives: ReminderEmailInput['initiatives'];
  emailInput: ReminderEmailInput;
  subject: string;
  body: string;
};

type ResendSendEmailResponse = {
  id?: string;
  name?: string;
  message?: string;
};

const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails';

export class ReminderEmailValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ReminderEmailValidationError';
    this.statusCode = statusCode;
  }
}

export const parseReminderInitiativeIds = (value: unknown) => {
  const rawIds = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const ids = rawIds.map((id) => Number(id));

  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id))) {
    return null;
  }

  return Array.from(new Set(ids));
};

const formatDate = (value: Date | null) => {
  if (!value) return '未入力';
  return value.toISOString().slice(0, 10);
};

export const getReminderEmailSubject = (initiatives: Array<Pick<Initiative, 'measureName'>>) => {
  if (initiatives.length === 1) {
    return `【リマインド】${initiatives[0].measureName}の最新進捗状況`;
  }

  return `【リマインド】${initiatives.length}件の施策の最新進捗状況`;
};

const buildInitiativeProgressText = (initiative: Initiative & { progressLogs: ProgressLog[] }) => {
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
    `施策名: ${initiative.measureName}`,
    `領域: ${initiative.domain}`,
    `担当部署: ${initiative.department || '未入力'}`,
    progressText,
  ].join('\n');
};

export const buildReminderEmailBody = ({ recipientName, introText, closingText, initiatives }: ReminderEmailInput) => {
  const initiativeSections = initiatives.map((initiative, index) => {
    return [`【対象施策${index + 1}】`, buildInitiativeProgressText(initiative)].join('\n');
  });

  return [
    `${recipientName} 様`,
    '',
    introText.trim(),
    '',
    '【対象施策の最新進捗状況】',
    ...initiativeSections,
    '',
    closingText.trim(),
  ].join('\n\n');
};

export const prepareReminderEmail = async ({
  prisma,
  userId,
  initiativeIds,
  missingSettingsMessage,
}: {
  prisma: PrismaClient;
  userId: number;
  initiativeIds: number[];
  missingSettingsMessage: string;
}): Promise<PreparedReminderEmail> => {
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
    throw new ReminderEmailValidationError('有効な送付先ユーザーが見つかりません。', 404);
  }

  const initiativesById = new Map(initiatives.map((initiative) => [initiative.id, initiative]));
  const selectedInitiatives = initiativeIds.flatMap((id) => {
    const initiative = initiativesById.get(id);
    return initiative ? [initiative] : [];
  });

  if (selectedInitiatives.length !== initiativeIds.length || selectedInitiatives.some((initiative) => !initiative.isActive)) {
    throw new ReminderEmailValidationError('有効な対象施策が見つかりません。', 404);
  }
  if (!settings) {
    throw new ReminderEmailValidationError(missingSettingsMessage, 400);
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

  return {
    user,
    selectedInitiatives,
    emailInput,
    subject,
    body,
  };
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
  const subject = getReminderEmailSubject(input.initiatives);
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
