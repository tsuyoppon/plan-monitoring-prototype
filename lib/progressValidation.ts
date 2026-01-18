export type ProgressLogFormData = {
  fiscalYear: number;
  fiscalQuarter: number;
  progressStatus: string;
  progressEvaluation: string;
  nextAction: string;
  nextActionDueDate: string;
};

export type ProgressLogFormErrors = Partial<Record<keyof ProgressLogFormData, string>>;

export const MAX_PROGRESS_STATUS_LENGTH = 50;
export const MAX_PROGRESS_EVALUATION_LENGTH = 2000;
export const MAX_NEXT_ACTION_LENGTH = 1000;

const isValidDateString = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const normalizeProgressLogInput = (input: {
  fiscalYear: number | string;
  fiscalQuarter: number | string;
  progressStatus?: string;
  progressEvaluation?: string;
  nextAction?: string;
  nextActionDueDate?: string;
}): ProgressLogFormData => ({
  fiscalYear: typeof input.fiscalYear === 'string' ? Number(input.fiscalYear) : input.fiscalYear,
  fiscalQuarter: typeof input.fiscalQuarter === 'string' ? Number(input.fiscalQuarter) : input.fiscalQuarter,
  progressStatus: input.progressStatus ?? '',
  progressEvaluation: input.progressEvaluation ?? '',
  nextAction: input.nextAction ?? '',
  nextActionDueDate: input.nextActionDueDate ?? '',
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
    errors.progressStatus = '進捗ステータスは必須です。';
  } else if (data.progressStatus.length > MAX_PROGRESS_STATUS_LENGTH) {
    errors.progressStatus = `進捗ステータスは${MAX_PROGRESS_STATUS_LENGTH}文字以内で入力してください。`;
  }

  if (!data.progressEvaluation.trim()) {
    errors.progressEvaluation = '進捗評価・詳細は必須です。';
  } else if (data.progressEvaluation.length > MAX_PROGRESS_EVALUATION_LENGTH) {
    errors.progressEvaluation = `進捗評価・詳細は${MAX_PROGRESS_EVALUATION_LENGTH}文字以内で入力してください。`;
  }

  if (!data.nextAction.trim()) {
    errors.nextAction = '次のアクションは必須です。';
  } else if (data.nextAction.length > MAX_NEXT_ACTION_LENGTH) {
    errors.nextAction = `次のアクションは${MAX_NEXT_ACTION_LENGTH}文字以内で入力してください。`;
  }

  if (!data.nextActionDueDate.trim()) {
    errors.nextActionDueDate = 'アクション期限は必須です。';
  } else if (!isValidDateString(data.nextActionDueDate)) {
    errors.nextActionDueDate = 'アクション期限を正しい日付形式で入力してください。';
  }

  return errors;
};
