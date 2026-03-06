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
