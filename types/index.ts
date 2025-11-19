export interface Initiative {
  id: number;
  domain: string;
  measureName: string;
  isActive: boolean;
  detail?: string;
  goal?: string;
  kpi?: string;
  startDate?: string;
  endDate?: string;
  department?: string;
  scheduleText?: string;
  createdAt: string;
  updatedAt: string;
  progressLogs?: ProgressLog[];
}

export interface ProgressLog {
  id: number;
  initiativeId: number;
  fiscalYear: number;
  fiscalQuarter: number;
  progressStatus?: string;
  progressEvaluation?: string;
  nextAction?: string;
  nextActionDueDate?: string;
  versionNo: number;
  isLatest: boolean;
  createdAt: string;
}
