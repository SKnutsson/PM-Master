import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSelect } from '@/components/UserSelect';
import { useProfiles } from '@/hooks/useProfiles';
import { ReviewField } from '@/lib/reviewTemplate';
import { cn } from '@/lib/utils';

interface Props {
  field: ReviewField;
  value: any;
  onChange: (value: any) => void;
  compact?: boolean;
  className?: string;
}

const YESNO = ['Ja', 'Nej'];
const YESNONA = ['Ja', 'Nej', 'Ej relevant'];
const SCOPE = ['Ingår', 'Ingår ej', 'Oklart', 'Option'];

export function ReviewFieldInput({ field, value, onChange, compact, className }: Props) {
  const { profiles } = useProfiles();
  const size = compact ? 'h-8 text-xs' : 'h-9 text-sm';

  const options =
    field.type === 'yesno' ? YESNO :
    field.type === 'yesnona' ? YESNONA :
    field.type === 'scope' ? SCOPE :
    field.options || [];

  if (field.type === 'person') {
    return (
      <div className={cn('min-w-[140px]', className)}>
        <UserSelect
          profiles={profiles}
          value={value || 'none'}
          onValueChange={(v) => onChange(v === 'none' ? '' : v)}
          placeholder={field.label}
        />
      </div>
    );
  }

  if (options.length > 0) {
    return (
      <Select value={value || '__none'} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
        <SelectTrigger className={cn(size, 'min-w-[120px]', className)}>
          <SelectValue placeholder="–" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="__none">–</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={compact ? 2 : 3}
        className={cn('text-sm min-w-[180px]', className)}
        placeholder={field.help}
      />
    );
  }

  return (
    <Input
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      className={cn(size, className)}
      placeholder={field.help}
    />
  );
}
