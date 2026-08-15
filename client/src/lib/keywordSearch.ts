export function toggleKeywordSelection(selected: string[], keyword: string) {
  return selected.includes(keyword) ? selected.filter(item => item !== keyword) : [...selected, keyword];
}

export function createSearchQuery(q: string, keywords: string[], from: string, to: string) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  keywords.forEach(keyword => params.append("kw", keyword));
  params.set("from", from);
  params.set("to", to);
  return params.toString();
}
