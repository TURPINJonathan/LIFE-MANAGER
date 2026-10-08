export type ContractType = 'cdi' | 'cdd' | 'interim' | 'apprenticeship' | 'other';
export type JobStatus = 'non_cadre' | 'cadre';
export type WorkDocumentKind = 'contract' | 'payslip' | 'other';
export type NetEstimateMode = 'params' | 'external';

export type WorkJobSummary = {
  id: string;
  workerId: string;
  title: string;
  companyName: string;
  contractType: ContractType;
  status: JobStatus;
  startDate: string;
  endDate: string | null;
  color: string | null;
  icon: string | null;
  position: number;
  contractWeeklyMinutes: number;
  timeTrackingEnabled: boolean;
  grossHourlyRateCents: number;
  archivedAt: string | null;
};

export type Worker = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  notes: string | null;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  jobs: WorkJobSummary[];
};

export type WorkJob = {
  id: string;
  workerId: string;
  workerFirstName: string;
  workerLastName: string;
  workerFullName: string;
  title: string;
  companyName: string;
  companySiret: string | null;
  contractType: ContractType;
  status: JobStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  color: string | null;
  icon: string | null;
  position: number;
  contractWeeklyMinutes: number;
  timeTrackingEnabled: boolean;
  weekStartsOn: number;
  workDaysMask: number;
  weekTemplate: WeekTemplate | null;
  grossHourlyRateCents: number;
  overtimeRateBps: number;
  overtimeRate2Bps: number | null;
  overtimeThresholdWeeklyMinutes: number | null;
  employeeContributionRateBps: number;
  pasRateBps: number;
  monthlyMutuelleCents: number;
  monthlyPrevoyanceCents: number;
  monthlyOtherDeductionCents: number;
  netEstimateMode: NetEstimateMode;
  archivedAt: string | null;
  createdAt: string;
};

export type TimeSegmentInput = {
  start: string;
  end: string;
};

/** Index 0 = lundi … 6 = dimanche. */
export type WeekTemplateDay = {
  enabled: boolean;
  segments: TimeSegmentInput[];
  pauseMinutes: number;
};

export type WeekTemplate = [
  WeekTemplateDay,
  WeekTemplateDay,
  WeekTemplateDay,
  WeekTemplateDay,
  WeekTemplateDay,
  WeekTemplateDay,
  WeekTemplateDay,
];

export type TimeEntry = {
  id: string;
  jobId: string;
  workDate: string;
  pauseMinutes: number;
  workedMinutesOverride: number | null;
  workedMinutes: number;
  notes: string | null;
  segments: Array<TimeSegmentInput & { id: string; position: number }>;
  createdAt: string;
  updatedAt: string;
};

export type TimeShortcut = {
  id: string;
  jobId: string;
  label: string;
  segments: TimeSegmentInput[];
  pauseMinutes: number;
  position: number;
};

export type WorkDocument = {
  id: string;
  jobId: string;
  kind: WorkDocumentKind;
  label: string;
  yearMonth: string | null;
  hasFile: boolean;
  fileUrl: string | null;
  originalName: string | null;
  mime: string | null;
  size: number | null;
  createdAt: string;
};

export type TimeStatsSummary = {
  workedMinutes: number;
  contractMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  overtime1Minutes: number;
  overtime2Minutes: number;
  estimatedGrossCents: number;
  estimatedNetBeforeTaxCents: number;
  estimatedPasCents: number;
  estimatedFixedDeductionsCents: number;
  estimatedNetPayableCents: number;
  employeeContributionRateBps: number;
  pasRateBps: number;
};

export type TimeWeekStats = {
  from: string;
  to: string;
  actual: TimeStatsSummary;
  planned: TimeStatsSummary;
  legalWeeklyMinutes: number;
  contractWeeklyMinutes: number;
  actualOvertimeVsLegalMinutes: number;
  plannedOvertimeVsLegalMinutes: number;
  actualOvertimeVsContractMinutes: number;
  plannedOvertimeVsContractMinutes: number;
};

export type TimeStats = {
  from: string;
  to: string;
  actual: TimeStatsSummary;
  planned: TimeStatsSummary;
  period: TimeStatsSummary;
  week: TimeStatsSummary & {
    from: string;
    to: string;
    actual?: TimeStatsSummary;
    planned?: TimeStatsSummary;
  };
  /** Semaines calendaires qui intersectent la période (bornes complètes). */
  weeks?: TimeWeekStats[];
  days: Array<{ workDate: string; plannedMinutes: number; actualMinutes: number }>;
  entryCount: number;
  planCount?: number;
};

export type WorkPlanEntry = {
  id: string;
  jobId: string;
  workDate: string;
  pauseMinutes: number;
  plannedMinutes: number;
  notes: string | null;
  segments: Array<TimeSegmentInput & { id: string; position: number }>;
  createdAt: string;
  updatedAt: string;
};

export type WorkDashboardJobRow = {
  job: WorkJob;
  planned: TimeStatsSummary;
  actual: TimeStatsSummary;
  workDays: number;
};

export type WorkDashboardWorker = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  notes: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  plannedGrossCents: number;
  actualGrossCents: number;
  plannedNetPayableCents: number;
  actualNetPayableCents: number;
  jobs: WorkDashboardJobRow[];
};

export type WorkDashboardTimelinePoint = {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  plannedCumulative: number;
  actualCumulative: number;
};

export type WorkDashboard = {
  yearMonth: string;
  from: string;
  to: string;
  daysInMonth: number;
  totals: {
    plannedMinutes: number;
    actualMinutes: number;
    deltaMinutes: number;
    plannedGrossCents: number;
    actualGrossCents: number;
    plannedNetPayableCents: number;
    actualNetPayableCents: number;
  };
  workers: WorkDashboardWorker[];
  timeline: WorkDashboardTimelinePoint[];
  alerts: Array<{
    kind: string;
    workerId: string;
    jobId: string;
    label: string;
    detail: string;
    value: number;
  }>;
};

export type ContributionSuggestion = {
  employeeContributionRateBps: number;
  source: string;
  note?: string;
};
