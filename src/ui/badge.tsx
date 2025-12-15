import React from 'react';
import { cn } from '../lib/utils';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-slate-900 hover:bg-slate-900/80 text-slate-50',
  secondary: 'bg-slate-100 hover:bg-slate-100/80 text-slate-900',
  destructive: 'bg-red-500 hover:bg-red-500/80 text-slate-50',
  outline: 'text-slate-950 border border-slate-200 hover:bg-slate-100'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className,
  children
}) => {
  return (
    <div className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
      badgeVariants[variant],
      className
    )}>
      {children}
    </div>
  );
};