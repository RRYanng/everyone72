// 本地日历日期 YYYY-MM-DD。
// 不要用 new Date().toISOString().split('T')[0]:那是 UTC 日期,
// 美西傍晚打完球会被记成"明天"。
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
