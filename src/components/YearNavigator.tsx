import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';

const years = [2026, 2027, 2028, 2029, 2030];

interface YearNavigatorProps {
  value: string;
  onChange: (value: string) => void;
  includeRolling?: boolean;
}

export function YearNavigator({ value, onChange, includeRolling = true }: YearNavigatorProps) {
  const isRolling = value === 'rolling' || value === 'rolling12';
  
  // For year navigation, only use year options
  const yearOptions = years.map(String);
  const currentYearValue = isRolling ? yearOptions[0] : value;
  const currentIdx = yearOptions.indexOf(currentYearValue);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isRolling || currentIdx <= 0}
        onClick={() => {
          const prev = yearOptions[currentIdx - 1];
          onChange(prev);
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span
        className={`min-w-[60px] text-center text-sm font-semibold select-none ${isRolling ? 'text-muted-foreground' : ''}`}
      >
        {isRolling ? '–' : currentYearValue}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isRolling || currentIdx >= yearOptions.length - 1 || currentIdx === -1}
        onClick={() => {
          const next = yearOptions[currentIdx + 1];
          onChange(next);
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {includeRolling && (
        <Button
          variant={isRolling ? 'default' : 'outline'}
          size="sm"
          className="ml-1 h-8 text-xs gap-1"
          onClick={() => {
            if (isRolling) {
              // Go back to first year
              onChange(yearOptions[0]);
            } else {
              onChange('rolling');
            }
          }}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          Rullande 12m
        </Button>
      )}
    </div>
  );
}
