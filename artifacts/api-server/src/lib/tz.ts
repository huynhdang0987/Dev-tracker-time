const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function nowInVN(): Date {
  return new Date(Date.now() + VN_OFFSET_MS);
}

export function toVNDate(date: Date): Date {
  return new Date(date.getTime() + VN_OFFSET_MS);
}

export function getTodayVN(): string {
  return nowInVN().toISOString().split("T")[0];
}

export function getDateStringVN(date: Date): string {
  return toVNDate(date).toISOString().split("T")[0];
}

export function getVNMinutes(date: Date): number {
  const vnDate = toVNDate(date);
  return vnDate.getUTCHours() * 60 + vnDate.getUTCMinutes();
}

export function parseExpectedTimeAsUTC(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const expectedMinutesFromMidnightVN = h * 60 + m;
  const vnMidnight = new Date(toVNDate(date).toISOString().split("T")[0] + "T00:00:00.000Z");
  return new Date(vnMidnight.getTime() + expectedMinutesFromMidnightVN * 60000 - VN_OFFSET_MS);
}
