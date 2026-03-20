export type ProgressLogFormData = {
  fiscalYear: number;
  fiscalQuarter: number;
  progressStatus: string;
  progressEvaluation: string;
  nextAction: string;
  inputBy: string;
  inputAt: string;
};

export type ProgressLogFormErrors = Partial<Record<keyof ProgressLogFormData, string>>;

export const PROGRESS_STATUSES = [
  '完了',
  '順調',
  '一部遅れ',
  '相応の遅れ',
  '大幅な遅れ',
  '未着手',
] as const;

export const MAX_PROGRESS_STATUS_LENGTH = 50;
export const MAX_PROGRESS_EVALUATION_LENGTH = 2000;
export const MAX_NEXT_ACTION_LENGTH = 1000;
export const MAX_INPUT_BY_LENGTH = 100;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeProgressLogInput = (input: {
  fiscalYear: number | string;
  fiscalQuarter: number | string;
  progressStatus?: string;
  progressEvaluation?: string;
  nextAction?: string;
  inputBy?: string;
  inputAt?: string;
}): ProgressLogFormData => ({
  fiscalYear: typeof input.fiscalYear === 'string' ? Number(input.fiscalYear) : input.fiscalYear,
  fiscalQuarter: typeof input.fiscalQuarter === 'string' ? Number(input.fiscalQuarter) : input.fiscalQuarter,
  progressStatus: input.progressStatus ?? '',
  progressEvaluation: input.progressEvaluation ?? '',
  nextAction: input.nextAction ?? '',
  inputBy: input.inputBy ?? '',
  inputAt: input.inputAt ?? '',
});

export const validateProgressLog = (data: ProgressLogFormData): ProgressLogFormErrors => {
  const errors: ProgressLogFormErrors = {};

  if (!Number.isInteger(data.fiscalYear) || data.fiscalYear <= 0) {
    errors.fiscalYear = '年度を正しく入力してください。';
  }

  if (![1, 2, 3, 4].includes(data.fiscalQuarter)) {
    errors.fiscalQuarter = '四半期は1〜4で指定してください。';
  }

  if (!data.progressStatus.trim()) {
    errors.progressStatus = '状況は必須です。';
  } else if (!PROGRESS_STATUSES.includes(data.progressStatus as (typeof PROGRESS_STATUSES)[number])) {
    errors.progressStatus = '状況の選択肢が不正です。';
  } else if (data.progressStatus.length > MAX_PROGRESS_STATUS_LENGTH) {
    errors.progressStatus = `状況は${MAX_PROGRESS_STATUS_LENGTH}文字以内で入力してください。`;
  }

  if (!data.progressEvaluation.trim()) {
    errors.progressEvaluation = '進捗は必須です。';
  } else if (data.progressEvaluation.length > MAX_PROGRESS_EVALUATION_LENGTH) {
    errors.progressEvaluation = `進捗は${MAX_PROGRESS_EVALUATION_LENGTH}文字以内で入力してください。`;
  }

  if (!data.nextAction.trim()) {
    errors.nextAction = '今後のアクションは必須です。';
  } else if (data.nextAction.length > MAX_NEXT_ACTION_LENGTH) {
    errors.nextAction = `今後のアクションは${MAX_NEXT_ACTION_LENGTH}文字以内で入力してください。`;
  }

  if (!data.inputBy.trim()) {
    errors.inputBy = '入力者は必須です。';
  } else if (data.inputBy.length > MAX_INPUT_BY_LENGTH) {
    errors.inputBy = `入力者は${MAX_INPUT_BY_LENGTH}文字以内で入力してください。`;
  }

  if (!data.inputAt.trim()) {
    errors.inputAt = '入力日時は必須です。';
  } else if (!DATE_ONLY_PATTERN.test(data.inputAt)) {
    errors.inputAt = '入力日時は日付で入力してください。';
  } else if (Number.isNaN(new Date(data.inputAt).getTime())) {
    errors.inputAt = '入力日時を正しく入力してください。';
  }

  return errors;
};
