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
    sm: { text: 'text-xl', icon: 'h-4 w-4' },
    md: { text: 'text-2xl', icon: 'h-5 w-5' },
    lg: { text: 'text-4xl', icon: 'h-8 w-8' },
  };

  // Always show "Aqall" in English for brand consistency
  // The Arabic name أقل is shown only when in Arabic mode
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "font-extrabold tracking-tight",
        sizes[size].text,
        language === 'ar' ? 'font-arabic' : 'font-sans'
      )}>
        <span className="text-gradient">
          {language === 'ar' ? 'أقل' : 'Aqall'}
        </span>
      </div>
    </div>
  );
}
