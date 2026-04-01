import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const years = [2026, 2027, 2028, 2029, 2030];

interface YearNavigatorProps {
  value: string;
  onChange: (value: string) => void;
  includeRolling?: boolean;
}

export function YearNavigator({ value, onChange, includeRolling = true }: YearNavigatorProps) {
  const options = [...years.map(String), ...(includeRolling ? ['rolling'] : [])];
  const currentIdx = options.indexOf(value);

  const canPrev = currentIdx > 0;
  const canNext = currentIdx < options.length - 1;

  const displayLabel = value === 'rolling' || value === 'rolling12' ? 'Rullande 12m' : value;

  // Normalize rolling variants
  const normalizedValue = value === 'rolling12' ? 'rolling' : value;
  const normalizedIdx = options.indexOf(normalizedValue);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={normalizedIdx <= 0}
        onClick={() => {
          const prev = options[normalizedIdx - 1];
          onChange(prev === 'rolling' && value.includes('12') ? 'rolling12' : prev);
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[100px] text-center text-sm font-semibold select-none">
        {value === 'rolling12' ? 'Rullande 12m' : displayLabel}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={normalizedIdx >= options.length - 1 || normalizedIdx === -1}
        onClick={() => {
          const next = options[normalizedIdx + 1];
          onChange(next === 'rolling' && value.includes('12') ? 'rolling12' : next);
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
