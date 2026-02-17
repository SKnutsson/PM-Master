import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GanttBarProps {
  activityId: string;
  projectId: string;
  activityName: string;
  startDate: string;
  endDate: string;
  statusColor: string;
  derivedStatus: string;
  responsible: string;
  columnCount: number;
  startCol: number;
  endCol: number;
  colWidth: number;
  onDatesChange: (projectId: string, activityId: string, startDate: string, endDate: string) => Promise<void>;
  colToDate: (colIndex: number) => string;
  dateToCol: (dateStr: string) => number;
  snapCols?: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (86400000)) + 1;
}

export function GanttBar({
  activityId,
  projectId,
  activityName,
  startDate,
  endDate,
  statusColor,
  derivedStatus,
  responsible,
  columnCount,
  startCol,
  endCol,
  colWidth,
  onDatesChange,
  colToDate,
  dateToCol,
  snapCols = 1,
}: GanttBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    origStartCol: number;
    origEndCol: number;
  } | null>(null);
  const [currentStartCol, setCurrentStartCol] = useState(startCol);
  const [currentEndCol, setCurrentEndCol] = useState(endCol);
  const [isSaving, setIsSaving] = useState(false);
  const hasDragged = useRef(false);
  const DRAG_THRESHOLD = 4;

  // Use refs so mousemove always reads latest values
  const currentStartColRef = useRef(currentStartCol);
  const currentEndColRef = useRef(currentEndCol);
  currentStartColRef.current = currentStartCol;
  currentEndColRef.current = currentEndCol;

  // Sync with props when not dragging AND not saving
  useEffect(() => {
    if (!dragState && !isSaving) {
      setCurrentStartCol(startCol);
      setCurrentEndCol(endCol);
    }
  }, [startCol, endCol, dragState, isSaving]);

  const getContainerWidth = useCallback(() => {
    const el = containerRef.current?.parentElement;
    return el ? el.clientWidth : 1;
  }, []);

  const snap = useCallback((col: number) => {
    return Math.round(col / snapCols) * snapCols;
  }, [snapCols]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    hasDragged.current = false;
    setDragState({
      type,
      startX: e.clientX,
      origStartCol: currentStartCol,
      origEndCol: currentEndCol,
    });
  }, [currentStartCol, currentEndCol]);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;

      if (!hasDragged.current && Math.abs(deltaX) < DRAG_THRESHOLD) return;
      hasDragged.current = true;

      const containerWidth = getContainerWidth();
      const colWidth = containerWidth / columnCount;
      const deltaCols = deltaX / colWidth;

      if (dragState.type === 'move') {
        const newStart = snap(dragState.origStartCol + deltaCols);
        const span = dragState.origEndCol - dragState.origStartCol;
        const newEnd = newStart + span;
        setCurrentStartCol(Math.max(0, newStart));
        setCurrentEndCol(Math.max(span, newEnd));
      } else if (dragState.type === 'resize-left') {
        const newStart = snap(dragState.origStartCol + deltaCols);
        // Allow shrinking to same day (startCol === endCol)
        setCurrentStartCol(Math.min(newStart, currentEndColRef.current));
      } else if (dragState.type === 'resize-right') {
        const newEnd = snap(dragState.origEndCol + deltaCols);
        // Allow shrinking to same day (endCol === startCol)
        setCurrentEndCol(Math.max(newEnd, currentStartColRef.current));
      }
    };

    const handleMouseUp = async () => {
      if (!hasDragged.current) {
        setDragState(null);
        return;
      }

      const finalStartCol = currentStartColRef.current;
      const finalEndCol = currentEndColRef.current;

      const newStartDate = colToDate(Math.max(0, finalStartCol));
      const newEndDate = colToDate(Math.max(0, finalEndCol));

      if (newStartDate !== startDate || newEndDate !== endDate) {
        setIsSaving(true);
        setDragState(null);
        try {
          await onDatesChange(projectId, activityId, newStartDate, newEndDate);
        } catch {
          setCurrentStartCol(startCol);
          setCurrentEndCol(endCol);
          toast.error('Kunde inte spara ändringen. Försök igen.');
        } finally {
          setIsSaving(false);
        }
      } else {
        setDragState(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // Only depend on dragState – read current cols from refs
  }, [dragState, columnCount, getContainerWidth, snap, colToDate, onDatesChange, projectId, activityId, startDate, endDate, startCol, endCol]);

  // Compute position in pixels using fixed column width for precision
  const BAR_INSET_PX = 2;
  const spanCols = currentEndCol - currentStartCol + 1;
  const leftPx = currentStartCol * colWidth + BAR_INSET_PX;
  const widthPx = Math.max(colWidth * 0.6, spanCols * colWidth - 2 * BAR_INSET_PX);

  const currentStartDate = dragState ? colToDate(Math.max(0, currentStartCol)) : startDate;
  const currentEndDate = dragState ? colToDate(Math.max(0, currentEndCol)) : endDate;
  const duration = daysBetween(currentStartDate, currentEndDate);

  // Make resize handles wider on narrow bars
  const isSingleDay = currentEndCol <= currentStartCol;

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute top-0.5 bottom-0.5 group/bar',
        isSaving && 'opacity-60',
        dragState && 'z-30'
      )}
      style={{
        left: `${Math.max(0, leftPx)}px`,
        width: `${Math.max(4, widthPx)}px`,
      }}
    >
      {/* Main bar */}
      <div
        className={cn(
          'h-full rounded-sm cursor-grab active:cursor-grabbing relative flex items-center',
          statusColor,
          dragState?.type === 'move' && 'ring-2 ring-primary/50 shadow-lg'
        )}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Left resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-col-resize opacity-0 group-hover/bar:opacity-100 hover:bg-black/20 rounded-l-sm transition-opacity z-10"
          onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0.5 w-0.5 h-2 bg-white/60 rounded" />
        </div>

        {/* Right resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize opacity-0 group-hover/bar:opacity-100 hover:bg-black/20 rounded-r-sm transition-opacity z-10"
          onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0.5 w-0.5 h-2 bg-white/60 rounded" />
        </div>
      </div>

      {/* Drag tooltip */}
      {dragState && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-2 py-0.5 text-[10px] whitespace-nowrap shadow-md z-40 pointer-events-none">
          <span className="font-medium">{formatDate(currentStartDate)} → {formatDate(currentEndDate)}</span>
          <span className="text-muted-foreground ml-1">({duration}d)</span>
        </div>
      )}
    </div>
  );
}
