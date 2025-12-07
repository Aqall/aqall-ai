'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Client component that sets the dir and lang attributes on the html element
 * This is needed because Next.js doesn't allow direct manipulation of <html> in layout.tsx
 */
export function HtmlDirectionSetter() {
  const { language, direction } = useLanguage();

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('dir', direction);
    html.setAttribute('lang', language);
  }, [language, direction]);

  return null;
}
