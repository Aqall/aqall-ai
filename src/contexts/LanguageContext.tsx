import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Landing
    'hero.title': 'Build Websites with AI',
    'hero.subtitle': 'Describe your vision in Arabic or English. Watch it come to life.',
    'hero.cta': 'Start Building',
    'hero.cta.secondary': 'See How It Works',
    
    // How it works
    'howItWorks.title': 'How It Works',
    'howItWorks.step1.title': 'Describe Your Vision',
    'howItWorks.step1.desc': 'Tell Aqall what you want to build in plain language.',
    'howItWorks.step2.title': 'AI Generates Code',
    'howItWorks.step2.desc': 'Our AI creates a complete React website instantly.',
    'howItWorks.step3.title': 'Iterate & Download',
    'howItWorks.step3.desc': 'Chat to refine, then download your project.',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Logout',
    
    // Auth
    'auth.login.title': 'Welcome Back',
    'auth.login.subtitle': 'Sign in to continue building',
    'auth.signup.title': 'Create Account',
    'auth.signup.subtitle': 'Start building amazing websites',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.submit.login': 'Sign In',
    'auth.submit.signup': 'Create Account',
    'auth.switch.login': 'Already have an account?',
    'auth.switch.signup': "Don't have an account?",
    
    // Dashboard
    'dashboard.title': 'Your Projects',
    'dashboard.empty': 'No projects yet. Create your first one!',
    'dashboard.newProject': 'Create New Project',
    'dashboard.project.lastEdited': 'Last edited',
    'dashboard.project.versions': 'versions',
    
    // Build Chat
    'build.title': 'Build Your Website',
    'build.placeholder': 'Describe the website you want to build...',
    'build.send': 'Generate',
    'build.generating': 'Generating...',
    'build.newVersion': 'Generate New Version',
    'build.preview': 'Preview',
    'build.download': 'Download ZIP',
    'build.versions': 'Version History',
    'build.back': 'Back to Dashboard',
    
    // Preview
    'preview.title': 'Website Preview',
    'preview.version': 'Version',
    'preview.download': 'Download ZIP',
    'preview.back': 'Back to Chat',
    
    // Footer
    'footer.tagline': 'Build websites with the power of AI.',
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.legal': 'Legal',
    'footer.features': 'Features',
    'footer.pricing': 'Pricing',
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.copyright': '© 2024 Aqall. All rights reserved.',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try Again',
  },
  ar: {
    // Landing
    'hero.title': 'ابنِ مواقع بالذكاء الاصطناعي',
    'hero.subtitle': 'صِف رؤيتك بالعربية أو الإنجليزية. شاهدها تتحقق.',
    'hero.cta': 'ابدأ البناء',
    'hero.cta.secondary': 'كيف يعمل',
    
    // How it works
    'howItWorks.title': 'كيف يعمل',
    'howItWorks.step1.title': 'صِف رؤيتك',
    'howItWorks.step1.desc': 'أخبر أقل بما تريد بناءه بلغة بسيطة.',
    'howItWorks.step2.title': 'الذكاء الاصطناعي يُنتج الكود',
    'howItWorks.step2.desc': 'يقوم ذكاؤنا الاصطناعي بإنشاء موقع React كامل فوراً.',
    'howItWorks.step3.title': 'عدّل وحمّل',
    'howItWorks.step3.desc': 'تحدث لتحسينه، ثم حمّل مشروعك.',
    
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.login': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'nav.logout': 'تسجيل الخروج',
    
    // Auth
    'auth.login.title': 'مرحباً بعودتك',
    'auth.login.subtitle': 'سجّل الدخول لمتابعة البناء',
    'auth.signup.title': 'إنشاء حساب',
    'auth.signup.subtitle': 'ابدأ ببناء مواقع رائعة',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.submit.login': 'تسجيل الدخول',
    'auth.submit.signup': 'إنشاء حساب',
    'auth.switch.login': 'لديك حساب بالفعل؟',
    'auth.switch.signup': 'ليس لديك حساب؟',
    
    // Dashboard
    'dashboard.title': 'مشاريعك',
    'dashboard.empty': 'لا توجد مشاريع بعد. أنشئ أول مشروع!',
    'dashboard.newProject': 'مشروع جديد',
    'dashboard.project.lastEdited': 'آخر تعديل',
    'dashboard.project.versions': 'إصدارات',
    
    // Build Chat
    'build.title': 'ابنِ موقعك',
    'build.placeholder': 'صِف الموقع الذي تريد بناءه...',
    'build.send': 'إنشاء',
    'build.generating': 'جارٍ الإنشاء...',
    'build.newVersion': 'إنشاء إصدار جديد',
    'build.preview': 'معاينة',
    'build.download': 'تحميل ZIP',
    'build.versions': 'سجل الإصدارات',
    'build.back': 'العودة للوحة التحكم',
    
    // Preview
    'preview.title': 'معاينة الموقع',
    'preview.version': 'الإصدار',
    'preview.download': 'تحميل ZIP',
    'preview.back': 'العودة للمحادثة',
    
    // Footer
    'footer.tagline': 'ابنِ مواقع بقوة الذكاء الاصطناعي.',
    'footer.product': 'المنتج',
    'footer.company': 'الشركة',
    'footer.legal': 'قانوني',
    'footer.features': 'المميزات',
    'footer.pricing': 'الأسعار',
    'footer.about': 'عن أقل',
    'footer.contact': 'تواصل',
    'footer.privacy': 'الخصوصية',
    'footer.terms': 'الشروط',
    'footer.copyright': '© 2024 أقل. جميع الحقوق محفوظة.',
    
    // Common
    'common.loading': 'جارٍ التحميل...',
    'common.error': 'حدث خطأ',
    'common.retry': 'حاول مجدداً',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const saved = localStorage.getItem('aqall-language') as Language;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLanguageState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('aqall-language', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
