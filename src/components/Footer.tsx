'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from '@/components/Logo';
import { Mail } from 'lucide-react';

export function Footer() {
  const { t, language } = useLanguage();

  const handleFeaturesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" className="mb-4" />
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {t('footer.tagline')}
            </p>
            <a
              href="mailto:Aqall.Team@gmail.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              Aqall.Team@gmail.com
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#features"
                  onClick={handleFeaturesClick}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.features')}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:Aqall.Team@gmail.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? `© ${new Date().getFullYear()} Aqall. جميع الحقوق محفوظة.`
              : `© ${new Date().getFullYear()} Aqall. All rights reserved.`
            }
          </p>
        </div>
      </div>
    </footer>
  );
}
