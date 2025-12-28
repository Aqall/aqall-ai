'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Sparkles, Globe, Zap, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function About() {
  const { language, direction } = useLanguage();

  const content = {
    en: {
      title: 'About Aqall',
      subtitle: 'Building the future of web development with AI',
      mission: {
        title: 'Our Mission',
        description: 'Aqall is an AI-powered platform that transforms your ideas into fully functional websites in seconds. We believe that everyone should be able to create beautiful, professional websites without writing a single line of code.',
      },
      vision: {
        title: 'Our Vision',
        description: 'We envision a world where creating websites is as simple as having a conversation. Our AI understands your needs in both Arabic and English, generating clean, scalable React code that you can customize and deploy anywhere.',
      },
      features: [
        {
          icon: Zap,
          title: 'Lightning Fast',
          description: 'Get your website generated in seconds, not hours or days.',
        },
        {
          icon: Globe,
          title: 'Bilingual Support',
          description: 'Full support for Arabic and English, with automatic RTL/LTR layout switching.',
        },
        {
          icon: Code2,
          title: 'Production Ready',
          description: 'Clean, modern React code that follows best practices and is ready to deploy.',
        },
        {
          icon: Sparkles,
          title: 'AI Powered',
          description: 'Advanced AI that understands context and generates exactly what you need.',
        },
      ],
      cta: 'Start Building',
    },
    ar: {
      title: 'حول Aqall',
      subtitle: 'بناء مستقبل تطوير الويب بالذكاء الاصطناعي',
      mission: {
        title: 'مهمتنا',
        description: 'Aqall هي منصة مدعومة بالذكاء الاصطناعي تحول أفكارك إلى مواقع ويب كاملة الوظائف في ثوانٍ. نؤمن بأن الجميع يجب أن يكون قادراً على إنشاء مواقع ويب جميلة واحترافية دون كتابة سطر واحد من الكود.',
      },
      vision: {
        title: 'رؤيتنا',
        description: 'نتصور عالماً حيث إنشاء المواقع بسيط مثل إجراء محادثة. ذكاؤنا الاصطناعي يفهم احتياجاتك بالعربية والإنجليزية، ويولد كود React نظيف وقابل للتوسع يمكنك تخصيصه ونشره في أي مكان.',
      },
      features: [
        {
          icon: Zap,
          title: 'سريع كالبرق',
          description: 'احصل على موقعك في ثوانٍ، وليس ساعات أو أيام.',
        },
        {
          icon: Globe,
          title: 'دعم ثنائي اللغة',
          description: 'دعم كامل للعربية والإنجليزية، مع تبديل تلقائي للتخطيط من اليمين لليسار والعكس.',
        },
        {
          icon: Code2,
          title: 'جاهز للإنتاج',
          description: 'كود React نظيف وحديث يتبع أفضل الممارسات وجاهز للنشر.',
        },
        {
          icon: Sparkles,
          title: 'مدعوم بالذكاء الاصطناعي',
          description: 'ذكاء اصطناعي متقدم يفهم السياق ويولد بالضبط ما تحتاجه.',
        },
      ],
      cta: 'ابدأ البناء',
    },
  };

  const t = content[language as 'en' | 'ar'];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial="initial"
            animate="animate"
            variants={fadeInUp}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {t.title}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12">
              {t.subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-6 bg-gradient-soft">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t.mission.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{t.mission.description}</p>
            </motion.div>
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t.vision.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{t.vision.description}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'ar' ? 'ما يميزنا' : 'What Makes Us Different'}
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.features.map((feature, index) => (
              <motion.div
                key={index}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {language === 'ar' ? 'جاهز للبدء؟' : 'Ready to Get Started?'}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {language === 'ar'
                ? 'ابدأ في بناء موقعك الأول الآن'
                : 'Start building your first website now'}
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link href="/auth?mode=signup">{t.cta}</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

