/**
 * Thai fiscal year starts in October.
 * Month 10-12 → next Buddhist Era year
 * Month 1-9  → current Buddhist Era year
 * Buddhist Era = CE + 543
 *
 * Example:
 *   2025-10-01 → 2569
 *   2026-09-30 → 2569
 *   2026-10-01 → 2570
 */
export function getThaiFiscalYear(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = d.getMonth() + 1 // 1-12
  const ceYear = d.getFullYear()
  const beYear = ceYear + 543
  return month >= 10 ? beYear + 1 : beYear
}

export function getCurrentThaiFiscalYear(): number {
  return getThaiFiscalYear(new Date())
}
