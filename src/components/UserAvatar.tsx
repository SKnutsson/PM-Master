import { cn } from '@/lib/utils';
import { UserProfile, getInitials } from '@/hooks/useProfiles';

interface UserAvatarProps {
  profile: UserProfile;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-24 w-24 text-4xl',
};

export function UserAvatar({ profile, size = 'sm', className }: UserAvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-bold select-none shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: profile.avatar_color || '#3b82f6' }}
    >
      {getInitials(profile)}
    </div>
  );
}

const FALLBACK_COLORS = ['#1C7F72', '#18323A', '#92AE9D', '#3b82f6', '#8b5cf6', '#ef4444', '#0ea5e9', '#f97316'];

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const f = parts[0].charAt(0).toUpperCase();
  const l = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : '';
  return `${f}${l}` || '?';
}

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

/** Avatar for a plain name string — used when the user no longer exists in the system. */
export function NameAvatar({ name, size = 'sm', className }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-bold select-none shrink-0 opacity-80',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: colorForName(name) }}
      title={name}
    >
      {nameInitials(name)}
    </div>
  );
}
