import { Shield, Briefcase, Zap, Crown, Search, Bot, Landmark, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';

// This matches the Prisma Enum we just created
export type UserRole = 'STANDARD' | 'BUSINESS' | 'INFLUENCER' | 'MODERATOR' | 'ADMIN' | 'FACT_CHECKER' | 'BOT' | 'GOVERNMENT';

interface RoleBadgeProps {
  role: UserRole | string; // Allow string to satisfy loose types, but logically it matches Enum
  className?: string;
  showLabel?: boolean;
}

export function UserRoleBadge({ role, className, showLabel = false }: RoleBadgeProps) {
  
  if (!role || role === 'STANDARD') return null;

  const configs: Record<string, { icon: any, label: string, style: string }> = {
    BUSINESS: {
      icon: Briefcase,
      label: 'Business',
      style: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    },
    INFLUENCER: {
      icon: Zap,
      label: 'Creator',
      style: 'text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10',
    },
    MODERATOR: {
      icon: Shield,
      label: 'Mod',
      style: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    },
    ADMIN: {
      icon: Crown,
      label: 'Admin',
      style: 'text-red-500 border-red-500/30 bg-red-500/10',
    },
    FACT_CHECKER: {
      icon: Search,
      label: 'Fact Checker',
      style: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    },
    BOT: {
      icon: Bot,
      label: 'Automated',
      style: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
    },
    GOVERNMENT: {
      icon: Landmark,
      label: 'Official',
      style: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    }
  };

  const config = configs[role];
  
  // Fallback if role is unknown
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div 
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider shadow-sm",
        config.style,
        className
      )}
      title={`${config.label} Account`}
    >
      <Icon size={10} strokeWidth={3} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}