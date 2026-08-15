export type SpecStatus = "all" | "active" | "closing" | "closed" | "unknown";
export type SpecSort = "latest" | "oldest" | "deadline" | "amount" | "title";

export type SpecFilterRow = {
  noticeDate?: Date | string | number | null;
  deadline?: Date | string | number | null;
  baseAmount?: number | string | null;
  title: string;
};

function toTimestamp(value: SpecFilterRow["noticeDate"] | SpecFilterRow["deadline"]) {
  if (!value) return Number.NaN;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
}

export function getSpecStatus(row: SpecFilterRow, now = new Date()) {
  const deadline = toTimestamp(row.deadline);
  if (!Number.isFinite(deadline)) return "unknown" as const;
  const nowTime = now.getTime();
  if (deadline < nowTime) return "closed" as const;
  if (deadline - nowTime <= 3 * 24 * 60 * 60 * 1000) return "closing" as const;
  return "active" as const;
}

export function filterAndSortSpecRows<T extends SpecFilterRow>(rows: T[], status: SpecStatus, sort: SpecSort, now = new Date()) {
  const filtered = status === "all" ? [...rows] : rows.filter(row => getSpecStatus(row, now) === status);
  return filtered.sort((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title, "ko");
    if (sort === "amount") return Number(right.baseAmount ?? 0) - Number(left.baseAmount ?? 0);
    const leftValue = sort === "deadline" ? toTimestamp(left.deadline) : toTimestamp(left.noticeDate);
    const rightValue = sort === "deadline" ? toTimestamp(right.deadline) : toTimestamp(right.noticeDate);
    const fallback = sort === "deadline" ? Number.MAX_SAFE_INTEGER : 0;
    const a = Number.isFinite(leftValue) ? leftValue : fallback;
    const b = Number.isFinite(rightValue) ? rightValue : fallback;
    return sort === "oldest" ? a - b : b - a;
  });
}
