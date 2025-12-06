import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageSquare, Code, Download, Sparkles } from 'lucide-react';

export default function Landing() {
  const { t, direction } = useLanguage();

  const steps = [
    {
      icon: MessageSquare,
      titleKey: 'howItWorks.step1.title',
      descKey: 'howItWorks.step1.desc',
    },
    {
      icon: Code,
      titleKey: 'howItWorks.step2.title',
      descKey: 'howItWorks.step2.desc',
    },
    {
      icon: Download,
      titleKey: 'howItWorks.step3.title',
      descKey: 'howItWorks.step3.desc',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium mb-8 animate-fade-up">
            <Sparkles className="h-4 w-4" />
            <span>{direction === 'rtl' ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 animate-fade-up stagger-1 leading-tight">
            {t('hero.title')}
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up stagger-2">
            {t('hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup" className="flex items-center gap-2">
                {t('hero.cta')}
                <ArrowRight className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
              </Link>
            </Button>
            <Button variant="hero-secondary" size="xl" asChild>
              <a href="#how-it-works">
                {t('hero.cta.secondary')}
              </a>
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative animate-fade-up stagger-4">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-card rounded-2xl border border-border shadow-elevated p-4 max-w-4xl mx-auto overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <div className="bg-secondary rounded-xl p-6 space-y-4">
                {/* Mock chat interface */}
                <div className={`flex ${direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                    U
                  </div>
                  <div className="bg-background rounded-xl px-4 py-3 shadow-sm max-w-md">
                    <p className="text-sm">
                      {direction === 'rtl' 
                        ? 'أريد موقع مطعم عصري مع قائمة طعام وحجوزات' 
                        : 'I want a modern restaurant website with a menu and reservations'
                      }
                    </p>
                  </div>
                </div>
                <div className={`flex ${direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                  <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="bg-primary-soft rounded-xl px-4 py-3 max-w-md">
                    <p className="text-sm text-primary">
                      {direction === 'rtl' 
                        ? 'جارٍ إنشاء موقعك... تم إنشاء 8 ملفات ✓' 
                        : 'Generating your website... Created 8 files ✓'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            {t('howItWorks.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all duration-300 group"
              >
                {/* Step number */}
                <div className="absolute -top-4 left-8 rtl:right-8 rtl:left-auto px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary-soft flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <step.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>

                <h3 className="text-xl font-semibold mb-3">
                  {t(step.titleKey)}
                </h3>
                <p className="text-muted-foreground">
                  {t(step.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-soft">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {direction === 'rtl' ? 'ابدأ البناء اليوم' : 'Start Building Today'}
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
            {direction === 'rtl' 
              ? 'انضم لآلاف المستخدمين الذين يبنون مواقعهم بالذكاء الاصطناعي'
              : 'Join thousands building their websites with AI'
            }
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/auth?mode=signup" className="flex items-center gap-2">
              {t('hero.cta')}
              <ArrowRight className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
