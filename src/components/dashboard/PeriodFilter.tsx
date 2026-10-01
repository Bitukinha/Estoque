import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Period, todayPeriod, currentMonthValue, isToday } from '@/lib/period';

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  allowAll?: boolean;
}

export function PeriodFilter({ value, onChange, allowAll = false }: PeriodFilterProps) {
  const changeMode = (mode: Period['mode']) => {
    if (mode === value.mode) return;
    if (mode === 'day') onChange(todayPeriod());
    else if (mode === 'month') onChange({ mode, value: value.mode === 'day' ? value.value.slice(0, 7) : currentMonthValue() });
    else onChange({ mode, value: '' });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Select value={value.mode} onValueChange={(v) => changeMode(v as Period['mode'])}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Dia</SelectItem>
          <SelectItem value="month">Mês</SelectItem>
          {allowAll && <SelectItem value="all">Tudo</SelectItem>}
        </SelectContent>
      </Select>
      {value.mode !== 'all' && (
        <Input
          type={value.mode === 'day' ? 'date' : 'month'}
          value={value.value}
          max={value.mode === 'day' ? todayPeriod().value : currentMonthValue()}
          onChange={(e) => e.target.value && onChange({ ...value, value: e.target.value })}
          className="w-[160px]"
          aria-label={value.mode === 'day' ? 'Data' : 'Mês'}
        />
      )}
      {!isToday(value) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(todayPeriod())}>
          Hoje
        </Button>
      )}
    </div>
  );
}
