export type ProgressLogFormData = {
  fiscalYear: number;
  fiscalQuarter: number;
  progressStatus: string;
  progressEvaluation: string;
  nextAction: string;
};

export type ProgressLogFormErrors = Partial<Record<keyof ProgressLogFormData, string>>;

export const MAX_PROGRESS_STATUS_LENGTH = 50;
export const MAX_PROGRESS_EVALUATION_LENGTH = 2000;
export const MAX_NEXT_ACTION_LENGTH = 1000;

export const normalizeProgressLogInput = (input: {
  fiscalYear: number | string;
  fiscalQuarter: number | string;
  progressStatus?: string;
  progressEvaluation?: string;
  nextAction?: string;
}): ProgressLogFormData => ({
  fiscalYear: typeof input.fiscalYear === 'string' ? Number(input.fiscalYear) : input.fiscalYear,
  fiscalQuarter: typeof input.fiscalQuarter === 'string' ? Number(input.fiscalQuarter) : input.fiscalQuarter,
  progressStatus: input.progressStatus ?? '',
  progressEvaluation: input.progressEvaluation ?? '',
  nextAction: input.nextAction ?? '',
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

  return errors;
};
