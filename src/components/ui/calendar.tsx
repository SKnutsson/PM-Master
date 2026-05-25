import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { sv } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  showFooter?: boolean;
  onClear?: () => void;
  onToday?: (d: Date) => void;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showWeekNumber = true,
  locale = sv,
  weekStartsOn = 1,
  showFooter = true,
  onClear,
  onToday,
  ...props
}: CalendarProps) {
  const handleClear = () => {
    if (onClear) return onClear();
    // @ts-ignore
    if (props.mode === 'single' && typeof (props as any).onSelect === 'function') {
      (props as any).onSelect(undefined);
    }
  };
  const handleToday = () => {
    const today = new Date();
    if (onToday) return onToday(today);
    // @ts-ignore
    if (props.mode === 'single' && typeof (props as any).onSelect === 'function') {
      (props as any).onSelect(today);
    }
  };

  return (
    <div className="flex flex-col">
      <DayPicker
        showOutsideDays={showOutsideDays}
        showWeekNumber={showWeekNumber}
        locale={locale}
        weekStartsOn={weekStartsOn as any}
        className={cn("p-3 pointer-events-auto", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium capitalize",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          head_cell_weeknumber: "w-9 font-semibold text-[0.7rem] text-muted-foreground/70",
          cell_weeknumber: "w-9 text-[0.7rem] font-semibold text-muted-foreground/70 tabular-nums",
          weeknumber: "flex items-center justify-center w-9 h-9 text-[0.7rem] font-semibold text-muted-foreground/70 tabular-nums",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />
      {showFooter && (
        <div className="flex items-center justify-between px-3 pb-3 -mt-1">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-primary hover:underline"
          >
            Rensa
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="text-xs text-primary hover:underline"
          >
            I dag
          </button>
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
