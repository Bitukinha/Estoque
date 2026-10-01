import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Period filter. `value` is "yyyy-MM-dd" for a day or "yyyy-MM" for a month,
 * matching the native date/month inputs; it is ignored for "all".
 */
export interface Period {
  mode: 'day' | 'month' | 'all';
  value: string;
}

export const todayPeriod = (): Period => ({ mode: 'day', value: format(new Date(), 'yyyy-MM-dd') });

export const currentMonthValue = () => format(new Date(), 'yyyy-MM');

/** Local-time [start, end) bounds of a day or month period. */
export function periodRange({ mode, value }: Period): { start: Date; end: Date } {
  const [y, m, d] = value.split('-').map(Number);
  if (mode === 'month') return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
  return { start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1) };
}

export function isInPeriod(isoDate: string, period: Period): boolean {
  if (period.mode === 'all') return true;
  const { start, end } = periodRange(period);
  const t = new Date(isoDate).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function isToday(period: Period): boolean {
  return period.mode === 'day' && period.value === todayPeriod().value;
}

/** Short label for titles: "Hoje", "29/09/2026", "set/2026" or "Tudo". */
export function periodLabel(period: Period): string {
  if (period.mode === 'all') return 'Tudo';
  if (isToday(period)) return 'Hoje';
  const { start } = periodRange(period);
  return period.mode === 'month' ? format(start, 'MMM/yyyy', { locale: ptBR }) : format(start, 'dd/MM/yyyy');
}
