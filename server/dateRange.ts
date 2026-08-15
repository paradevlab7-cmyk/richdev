export function parseStartOfDay(value?: string) {
  return value ? new Date(value) : undefined;
}

export function parseEndOfDay(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}
