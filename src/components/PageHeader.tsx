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
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6", className)}>
            <div className="space-y-1">
                {backLink && (
                    <Link
                        to={backLink}
                        className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-2 transition-colors w-fit"
                    >
                        <ArrowLeft size={12} /> {backLabel || 'Back'}
                    </Link>
                )}
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
                    {title}
                </h1>
                {subtitle && (
                    <div className="text-sm text-slate-500 font-medium">
                        {subtitle}
                    </div>
                )}
            </div>

            {action && (
                <div className="flex items-center gap-3">
                    {action}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
