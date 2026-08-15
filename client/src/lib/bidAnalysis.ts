export function parseKrwAmount(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function formatKrwInput(value: string) {
  const amount = parseKrwAmount(value);
  return amount ? amount.toLocaleString("ko-KR") : "";
}

export function formatKrw(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value).toLocaleString("ko-KR")}원` : "—";
}

export function getRangeMarker(lowRate: number, highRate: number, medianRate: number) {
  if (!Number.isFinite(lowRate) || !Number.isFinite(highRate) || !Number.isFinite(medianRate) || highRate <= lowRate) return 50;
  return Math.max(0, Math.min(100, ((medianRate - lowRate) / (highRate - lowRate)) * 100));
}
