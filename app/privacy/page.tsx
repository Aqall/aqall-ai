'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Privacy() {
  const { language, direction } = useLanguage();

  const content = {
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: January 2025',
      sections: [
        {
          title: '1. Information We Collect',
          text: 'We collect information that you provide directly to us, including your email address, name, and any content you create using our service. We also collect usage data to improve our services.',
        },
        {
          title: '2. How We Use Your Information',
          text: 'We use your information to provide, maintain, and improve our services, process your requests, and communicate with you about our services.',
        },
        {
          title: '3. Data Security',
          text: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.',
        },
        {
          title: '4. Data Retention',
          text: 'We retain your personal information for as long as necessary to provide our services and comply with legal obligations.',
        },
        {
          title: '5. Your Rights',
          text: 'You have the right to access, update, or delete your personal information at any time. You can do this through your account settings or by contacting us.',
        },
        {
          title: '6. Contact Us',
          text: 'If you have any questions about this Privacy Policy, please contact us at Aqall.Team@gmail.com',
        },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      lastUpdated: 'آخر تحديث: يناير 2025',
      sections: [
        {
          title: '1. المعلومات التي نجمعها',
          text: 'نجمع المعلومات التي تقدمها لنا مباشرة، بما في ذلك عنوان بريدك الإلكتروني واسمك وأي محتوى تنشئه باستخدام خدمتنا. كما نجمع بيانات الاستخدام لتحسين خدماتنا.',
        },
        {
          title: '2. كيفية استخدام معلوماتك',
          text: 'نستخدم معلوماتك لتقديم خدماتنا وصيانتها وتحسينها، ومعالجة طلباتك والتواصل معك حول خدماتنا.',
        },
        {
          title: '3. أمان البيانات',
          text: 'نطبق التدابير التقنية والتنظيمية المناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التعديل أو الكشف أو التدمير.',
        },
        {
          title: '4. الاحتفاظ بالبيانات',
          text: 'نحتفظ بمعلوماتك الشخصية طالما كان ذلك ضرورياً لتقديم خدماتنا والامتثال للالتزامات القانونية.',
        },
        {
          title: '5. حقوقك',
          text: 'لديك الحق في الوصول إلى معلوماتك الشخصية أو تحديثها أو حذفها في أي وقت. يمكنك القيام بذلك من خلال إعدادات حسابك أو بالاتصال بنا.',
        },
        {
          title: '6. اتصل بنا',
          text: 'إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا على Aqall.Team@gmail.com',
        },
      ],
    },
  };

  const t = content[language as 'en' | 'ar'];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-20">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="text-muted-foreground mb-12">{t.lastUpdated}</p>

          <div className="space-y-8">
            {t.sections.map((section, index) => (
              <motion.div
                key={index}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <h2 className="text-2xl font-semibold mb-3">{section.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{section.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Link
              href="/"
              className="text-primary hover:underline"
            >
              {language === 'ar' ? '← العودة للصفحة الرئيسية' : '← Back to Home'}
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

