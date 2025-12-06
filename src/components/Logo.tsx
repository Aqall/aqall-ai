import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const { language } = useLanguage();
  
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "font-bold tracking-tight",
        sizes[size],
        language === 'ar' ? 'font-arabic' : 'font-sans'
      )}>
        <span className="text-primary">
          {language === 'ar' ? 'عقّل' : 'Aqall'}
        </span>
      </div>
    </div>
  );
}
