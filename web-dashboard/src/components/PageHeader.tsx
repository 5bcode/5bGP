import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    backLink?: string;
    backLabel?: string;
    action?: React.ReactNode;
    className?: string;
}

const PageHeader = ({ title, subtitle, backLink, backLabel, action, className }: PageHeaderProps) => {
    return (
        <div className={cn("flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-6 border-b border-white/5", className)}>
            <div className="space-y-2">
                {backLink && (
                    <Link
                        to={backLink}
                        className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 hover:text-emerald-400 flex items-center gap-2 mb-4 transition-all group w-fit"
                    >
                        <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> {backLabel || 'Return'}
                    </Link>
                )}
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                        {title}
                    </h1>
                    {subtitle && (
                        <div className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>

            {action && (
                <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                    {action}
                </div>
            )}
        </div>
    );
};


export default PageHeader;
