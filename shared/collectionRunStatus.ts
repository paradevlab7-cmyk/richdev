export const SUPERSEDED_STANDARD_DATE_PARAMETER_MESSAGE = "Superseded after PubDataOpnStdService date-parameter correction";

export function normalizeCollectionRunError(status: string, errorMessage: string | null | undefined) {
  return status === "success" && errorMessage === SUPERSEDED_STANDARD_DATE_PARAMETER_MESSAGE ? null : errorMessage ?? null;
}

export function hasActionableCollectionError(status: string, errorMessage: string | null | undefined) {
  return status === "failed" && Boolean(normalizeCollectionRunError(status, errorMessage));
}
