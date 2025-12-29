import { Shield, Briefcase, Zap, Crown, Search, Bot, Landmark, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import styles from './userrolebadge.module.css';

// Exact match to your Prisma Enum
export type UserRole = 'STANDARD' | 'BUSINESS' | 'INFLUENCER' | 'MODERATOR' | 'ADMIN' | 'FACT_CHECKER' | 'BOT' | 'GOVERNMENT' | 'EXPERT';

interface RoleBadgeProps {
  role: UserRole | string;
  className?: string;
  showLabel?: boolean;
}

export function UserRoleBadge({ role, className, showLabel = true }: RoleBadgeProps) {
  
  if (!role || role === 'STANDARD') return null;

  // We map the HEX color for the CSS animation variable, 
  // and the Tailwind classes for static styling.
  const configs: Record<string, { icon: any, label: string, colorHex: string, tailwind: string }> = {
    BUSINESS: {
      icon: Briefcase,
      label: 'Business',
      colorHex: '#fbbf24', // Amber 400
      tailwind: 'text-amber-400 bg-amber-400/10',
    },
    INFLUENCER: {
      icon: Zap,
      label: 'Creator',
      colorHex: '#e879f9', // Fuchsia 400
      tailwind: 'text-fuchsia-400 bg-fuchsia-400/10',
    },
    MODERATOR: {
      icon: Shield,
      label: 'Mod',
      colorHex: '#34d399', // Emerald 400
      tailwind: 'text-emerald-400 bg-emerald-400/10',
    },
    ADMIN: {
      icon: Crown,
      label: 'Admin',
      colorHex: '#ef4444', // Red 500
      tailwind: 'text-red-500 bg-red-500/10',
    },
    FACT_CHECKER: {
      icon: Search,
      label: 'Fact Check',
      colorHex: '#22d3ee', // Cyan 400
      tailwind: 'text-cyan-400 bg-cyan-400/10',
    },
    EXPERT: {
      icon: BadgeCheck,
      label: 'Expert',
      colorHex: '#818cf8', // Indigo 400
      tailwind: 'text-indigo-400 bg-indigo-400/10',
    },
    BOT: {
      icon: Bot,
      label: 'Automated',
      colorHex: '#9ca3af', // Gray 400
      tailwind: 'text-gray-400 bg-gray-400/10',
    },
    GOVERNMENT: {
      icon: Landmark,
      label: 'Official',
      colorHex: '#60a5fa', // Blue 400
      tailwind: 'text-blue-400 bg-blue-400/10',
    }
  };

  const config = configs[role];
  
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div 
      className={clsx(
        styles.badgeBase,
        config.tailwind,
        className
      )}
      style={{ '--badge-color': config.colorHex } as React.CSSProperties}
      title={`${config.label} Account`}
    >
      <Icon size={12} strokeWidth={3} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}