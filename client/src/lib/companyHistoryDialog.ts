export const COMPANY_HISTORY_OPEN_EVENT = "g2b:company-history-open";

export function requestCompanyHistoryOpen() {
  window.dispatchEvent(new Event(COMPANY_HISTORY_OPEN_EVENT));
}

export function subscribeToCompanyHistoryOpen(onOpen: () => void) {
  window.addEventListener(COMPANY_HISTORY_OPEN_EVENT, onOpen);
  return () => window.removeEventListener(COMPANY_HISTORY_OPEN_EVENT, onOpen);
}
