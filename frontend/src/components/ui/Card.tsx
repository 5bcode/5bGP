import clsx from 'clsx';
import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa6';

interface CardProps {
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: () => void;
  actionLabel?: string;
}

export function Card({ title, icon, children, className, action, actionLabel = "view all" }: CardProps) {
  return (
    <div className={clsx("flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full", className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-white/5 backdrop-blur-sm">
        <h3 className="flex items-center gap-2.5 font-semibold text-primary">
          {icon && <span className="text-gold">{icon}</span>}
          {title}
        </h3>
        {action && (
          <button
            onClick={action}
            className="text-xs font-medium text-muted hover:text-gold flex items-center gap-1 transition-colors uppercase tracking-wider"
          >
            {actionLabel} <FaChevronRight size={10} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {children}
      </div>
    </div>
  );
}
