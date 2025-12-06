import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Languages } from 'lucide-react';

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50", className)}>
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300",
          language === 'en'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ar')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 font-arabic",
          language === 'ar'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        عربي
      </button>
    </div>
  );
}
