export type RecurringInvoiceScheduleState = {
  isActive: boolean;
  deletedAt?: string | null;
};

export function isRecurringInvoiceScheduleActive(
  schedule: RecurringInvoiceScheduleState
) {
  return schedule.isActive && !schedule.deletedAt;
}

export function deactivateRecurringInvoiceSchedule<T extends RecurringInvoiceScheduleState>(
  schedule: T,
  deletedAt = new Date().toISOString()
): T & { isActive: false; deletedAt: string } {
  if (schedule.deletedAt) {
    return {
      ...schedule,
      isActive: false,
      deletedAt: schedule.deletedAt,
    };
  }

  return {
    ...schedule,
    isActive: false,
    deletedAt,
  };
}

export function getDueRecurringInvoiceSchedules<
  T extends RecurringInvoiceScheduleState & { nextSendDate: string }
>(schedules: T[], todayIsoDate: string) {
  return schedules.filter(
    (schedule) =>
      isRecurringInvoiceScheduleActive(schedule) &&
      /^\d{4}-\d{2}-\d{2}$/.test(schedule.nextSendDate) &&
      schedule.nextSendDate <= todayIsoDate
  );
}
