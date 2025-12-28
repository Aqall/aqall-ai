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

export default function Terms() {
  const { language, direction } = useLanguage();

  const content = {
    en: {
      title: 'Terms of Service',
      lastUpdated: 'Last Updated: January 2025',
      sections: [
        {
          title: '1. Acceptance of Terms',
          text: 'By accessing and using Aqall, you accept and agree to be bound by the terms and provision of this agreement.',
        },
        {
          title: '2. Use License',
          text: 'Permission is granted to use Aqall for personal and commercial purposes. You may not modify, copy, or redistribute the service without permission.',
        },
        {
          title: '3. User Accounts',
          text: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
        },
        {
          title: '4. User Content',
          text: 'You retain ownership of all content you create using Aqall. You grant us a license to use, store, and process your content solely for the purpose of providing our services.',
        },
        {
          title: '5. Prohibited Uses',
          text: 'You may not use our service for any illegal or unauthorized purpose, or to violate any laws in your jurisdiction.',
        },
        {
          title: '6. Service Availability',
          text: 'We strive to maintain service availability but do not guarantee uninterrupted access. We reserve the right to modify or discontinue the service at any time.',
        },
        {
          title: '7. Limitation of Liability',
          text: 'Aqall shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.',
        },
        {
          title: '8. Contact Information',
          text: 'For any questions regarding these Terms of Service, please contact us at Aqall.Team@gmail.com',
        },
      ],
    },
    ar: {
      title: 'شروط الخدمة',
      lastUpdated: 'آخر تحديث: يناير 2025',
      sections: [
        {
          title: '1. قبول الشروط',
          text: 'من خلال الوصول إلى Aqall واستخدامه، تقبل وتوافق على الالتزام بشروط وأحكام هذه الاتفاقية.',
        },
        {
          title: '2. ترخيص الاستخدام',
          text: 'يُمنح الإذن لاستخدام Aqall للأغراض الشخصية والتجارية. لا يجوز لك تعديل أو نسخ أو إعادة توزيع الخدمة دون إذن.',
        },
        {
          title: '3. حسابات المستخدمين',
          text: 'أنت مسؤول عن الحفاظ على سرية بيانات اعتماد حسابك وعن جميع الأنشطة التي تحدث تحت حسابك.',
        },
        {
          title: '4. محتوى المستخدم',
          text: 'تحتفظ بملكية جميع المحتوى الذي تنشئه باستخدام Aqall. تمنحنا ترخيصاً لاستخدام وتخزين ومعالجة محتواك فقط لغرض تقديم خدماتنا.',
        },
        {
          title: '5. الاستخدامات المحظورة',
          text: 'لا يجوز لك استخدام خدمتنا لأي غرض غير قانوني أو غير مصرح به، أو لانتهاك أي قوانين في ولايتك القضائية.',
        },
        {
          title: '6. توفر الخدمة',
          text: 'نسعى للحفاظ على توفر الخدمة ولكن لا نضمن الوصول دون انقطاع. نحتفظ بالحق في تعديل أو إيقاف الخدمة في أي وقت.',
        },
        {
          title: '7. تحديد المسؤولية',
          text: 'لن تكون Aqall مسؤولة عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية ناتجة عن استخدامك للخدمة.',
        },
        {
          title: '8. معلومات الاتصال',
          text: 'لأي أسئلة بخصوص شروط الخدمة هذه، يرجى الاتصال بنا على Aqall.Team@gmail.com',
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

