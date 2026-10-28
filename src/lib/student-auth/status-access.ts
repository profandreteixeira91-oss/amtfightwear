/** Eligibility is deliberately separate: trial/invited app access is preserved. */
export function canStudentCheckIn(status: string | null | undefined): boolean {
  return status === "active";
}

export function canStudentUseApp(status: string | null | undefined): boolean {
  return status == null || ["active", "trial", "invited"].includes(status);
}