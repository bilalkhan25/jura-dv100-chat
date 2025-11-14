export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatPercentage(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.round((Math.min(Math.max(value, 0), total) / total) * 100);
}
