import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  MessageSquare, 
  Code2, 
  Download, 
  Sparkles,
  Zap,
  Globe,
  Layers,
  MousePointer2,
  Wand2,
  Check,
  ArrowUpRight
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

export default function Landing() {
  const { t, direction, language } = useLanguage();

  const steps = [
    {
      icon: MessageSquare,
      titleKey: 'howItWorks.step1.title',
      descKey: 'howItWorks.step1.desc',
      gradient: 'from-teal-500/20 to-cyan-500/20',
    },
    {
      icon: Code2,
      titleKey: 'howItWorks.step2.title',
      descKey: 'howItWorks.step2.desc',
      gradient: 'from-cyan-500/20 to-blue-500/20',
    },
    {
      icon: Download,
      titleKey: 'howItWorks.step3.title',
      descKey: 'howItWorks.step3.desc',
      gradient: 'from-blue-500/20 to-indigo-500/20',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: language === 'ar' ? 'سريع كالبرق' : 'Lightning Fast',
      desc: language === 'ar' ? 'احصل على موقعك في ثوانٍ' : 'Get your website in seconds',
    },
    {
      icon: Globe,
      title: language === 'ar' ? 'ثنائي اللغة' : 'Bilingual',
      desc: language === 'ar' ? 'دعم كامل للعربية والإنجليزية' : 'Full Arabic & English support',
    },
    {
      icon: Layers,
      title: language === 'ar' ? 'React جاهز' : 'React Ready',
      desc: language === 'ar' ? 'كود نظيف وقابل للتوسع' : 'Clean, scalable code',
    },
    {
      icon: MousePointer2,
      title: language === 'ar' ? 'لا كود' : 'No Code',
      desc: language === 'ar' ? 'فقط تحدث بلغتك' : 'Just speak your language',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl float" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary-light/5 rounded-full blur-3xl float-delayed" />
        
        {/* Floating Elements */}
        <motion.div 
          className="absolute top-40 left-[10%] hidden lg:block"
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-light/20 backdrop-blur-sm border border-primary/10 flex items-center justify-center shadow-lg">
            <Code2 className="w-8 h-8 text-primary" />
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute top-60 right-[15%] hidden lg:block"
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-500/10 flex items-center justify-center shadow-lg">
            <Wand2 className="w-7 h-7 text-cyan-600" />
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-40 left-[20%] hidden lg:block"
          animate={{ y: [0, -15, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-500/10 flex items-center justify-center shadow-lg">
            <Globe className="w-6 h-6 text-indigo-600" />
          </div>
        </motion.div>

        <div className="container mx-auto relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Main headline */}
            <motion.h1 
              variants={fadeInUp}
              className="hero-title text-center mb-8"
            >
              {language === 'ar' ? (
                <div className="hero-title-arabic">
                  <div className="hero-title-line">
                    <span>ابنِ مواقع مذهلة </span>
                    <span className="hero-title-gradient">بقوة الذكاء الاصطناعي</span>
                  </div>
                </div>
              ) : (
                <div className="hero-title-english">
                  <div className="hero-title-line">Build Stunning Websites</div>
                  <div className="hero-title-line hero-title-gradient">With AI Power</div>
                </div>
              )}
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button variant="hero" size="xl" asChild className="group relative overflow-hidden">
                <Link to="/auth?mode=signup" className="flex items-center gap-3">
                  <span className="relative z-10">{t('hero.cta')}</span>
                  <ArrowRight className={`h-5 w-5 relative z-10 transition-transform group-hover:translate-x-1 ${direction === 'rtl' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-light to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </Button>
              <Button variant="hero-secondary" size="xl" asChild className="group">
                <a href="#how-it-works" className="flex items-center gap-2">
                  {t('hero.cta.secondary')}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Hero Visual - Chat Preview */}
          <motion.div 
            className="mt-20 lg:mt-28 relative max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glow effect behind the card */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary-light/20 to-cyan-500/20 blur-3xl -z-10 scale-110" />
            
            <div className="glass-strong rounded-3xl p-2 shadow-elevated">
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      aqall.app/build
                    </div>
                  </div>
                </div>
                
                {/* Chat content */}
                <div className="p-6 lg:p-8 space-y-6 bg-gradient-to-b from-muted/20 to-transparent">
                  {/* User message */}
                  <motion.div 
                    className="flex flex-row justify-end gap-4"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                  >
                    <div className="bg-background rounded-2xl px-5 py-4 shadow-card max-w-md border border-border/50">
                      <p className="text-sm leading-relaxed">
                        {language === 'ar' 
                          ? 'أريد موقع لمطعم عصري مع قائمة طعام ونظام حجوزات وتصميم أنيق' 
                          : 'I want a modern restaurant website with a menu, reservation system, and elegant design'
                        }
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-semibold shadow-lg flex-shrink-0">
                      U
                    </div>
                  </motion.div>
                  
                  {/* AI response */}
                  <motion.div 
                    className={`flex ${direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'} gap-4`}
                    initial={{ opacity: 0, x: direction === 'rtl' ? -30 : 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary-light/20 flex items-center justify-center shadow-lg pulse-glow">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="bg-primary/5 rounded-2xl px-5 py-4 max-w-lg border border-primary/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-sm font-medium text-primary">
                          {language === 'ar' ? 'تم إنشاء موقعك!' : 'Website Generated!'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          language === 'ar' ? '8 ملفات' : '8 files',
                          language === 'ar' ? 'React + Tailwind' : 'React + Tailwind',
                          language === 'ar' ? 'RTL جاهز' : 'RTL Ready'
                        ].map((tag, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-28 px-6 bg-gradient-soft">
        <div className="container mx-auto">
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-5xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="group relative p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-elevated"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32 px-6 scroll-mt-20">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16 lg:mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              {language === 'ar' ? 'كيف يعمل' : 'How It Works'}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {language === 'ar' ? 'ثلاث خطوات بسيطة' : 'Three Simple Steps'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'من الفكرة إلى الموقع الجاهز في دقائق'
                : 'From idea to ready website in minutes'
              }
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                className="relative group"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className={`hidden lg:block absolute top-16 ${direction === 'rtl' ? 'right-full mr-6' : 'left-full ml-6'} w-full h-px bg-gradient-to-r from-primary/30 to-transparent`} />
                )}
                
                <div className={`relative p-8 lg:p-10 rounded-3xl bg-gradient-to-br ${step.gradient} border border-border/50 hover:border-primary/20 transition-all duration-500 hover:shadow-elevated group-hover:-translate-y-2`}>
                  {/* Step number */}
                  <div className="absolute -top-4 left-8 rtl:right-8 rtl:left-auto px-4 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-card shadow-card flex items-center justify-center mb-6 group-hover:shadow-elevated transition-shadow">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>

                  <h3 className="text-2xl font-bold mb-4">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(step.descKey)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_40%)]" />
        
        {/* Floating shapes */}
        <motion.div 
          className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-white/5 blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-[15%] w-40 h-40 rounded-full bg-white/5 blur-2xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="container mx-auto relative z-10">
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {language === 'ar' ? 'جاهز للبناء؟' : 'Ready to Build?'}
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-xl mx-auto">
              {language === 'ar' 
                ? 'انضم لآلاف المبدعين الذين يبنون مواقعهم بالذكاء الاصطناعي'
                : 'Join thousands of creators building their websites with AI'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="xl" 
                asChild 
                className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all group"
              >
                <Link to="/auth?mode=signup" className="flex items-center gap-3">
                  <span>{t('hero.cta')}</span>
                  <ArrowRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${direction === 'rtl' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
              {[
                language === 'ar' ? 'مجاني للبدء' : 'Free to Start',
                language === 'ar' ? 'لا بطاقة ائتمان' : 'No Credit Card',
                language === 'ar' ? 'دعم عربي' : 'Arabic Support',
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-white/80" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
