export type NoticeForUnification = {
  id: number;
  noticeId: string;
  sourceType: string;
};

export type UnifiedNotice<T extends NoticeForUnification> = {
  notice: T;
  sourceTypes: string[];
  duplicateCount: number;
};

function bidKey(notice: NoticeForUnification) {
  return notice.noticeId.replace(/^[^:]+:/, "");
}

export function unifyServiceBidNotices<T extends NoticeForUnification>(notices: T[]): UnifiedNotice<T>[] {
  const groups = new Map<string, UnifiedNotice<T>>();
  for (const notice of notices) {
    const isBidFamily = notice.sourceType === "bid" || notice.sourceType === "standard";
    const key = isBidFamily ? `bid:${bidKey(notice)}` : `notice:${notice.id}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { notice, sourceTypes: [notice.sourceType], duplicateCount: 1 });
      continue;
    }
    const sourceTypes = Array.from(new Set([...current.sourceTypes, notice.sourceType]));
    const preferCurrent = current.notice.sourceType === "bid" || notice.sourceType !== "bid";
    groups.set(key, { notice: preferCurrent ? current.notice : notice, sourceTypes, duplicateCount: current.duplicateCount + 1 });
  }
  return Array.from(groups.values());
}
