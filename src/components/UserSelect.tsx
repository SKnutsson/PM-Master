import { UserProfile, getDisplayName } from '@/hooks/useProfiles';
import { UserAvatar } from './UserAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserSelectProps {
  profiles: UserProfile[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function UserSelect({ profiles, value, onValueChange, placeholder = 'Välj ansvarig' }: UserSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Ingen</SelectItem>
        {profiles.map((p) => {
          const name = getDisplayName(p);
          if (!name) return null;
          return (
            <SelectItem key={p.user_id} value={name}>
              <div className="flex items-center gap-2">
                <UserAvatar profile={p} size="xs" />
                <span>{name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
