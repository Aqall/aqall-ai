'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ArrowLeft, Loader2, Mail, Lock, MailCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

export default function Auth() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const { login, signup, user } = useAuth();
  const { t, direction, language } = useLanguage();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const result = isLogin 
      ? await login(email, password)
      : await signup(email, password);

    if (result.error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.needsConfirmation) {
      // Show email confirmation message
      setNeedsEmailConfirmation(true);
      toast({
        title: language === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check your email',
        description: language === 'ar' 
          ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني. يرجى التحقق من بريدك والنقر على الرابط للتفعيل.'
          : 'We sent a confirmation link to your email. Please check your inbox and click the link to verify your account.',
      });
    } else {
      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: isLogin 
          ? (language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully')
          : (language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully'),
      });
      router.push('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        
        <motion.div 
          className="w-full max-w-md mx-auto relative z-10"
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {/* Back link */}
          <motion.div variants={fadeInUp}>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
            >
              <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${direction === 'rtl' ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
              <span>{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-8">
            <Logo size="lg" className="mb-6" />
            {needsEmailConfirmation ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <MailCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2 text-center">
                  {t('auth.confirm.title')}
                </h1>
                <p className="text-muted-foreground text-center">
                  {t('auth.confirm.message')} <strong>{email}</strong>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-2">
                  {isLogin ? t('auth.login.title') : t('auth.signup.title')}
                </h1>
                <p className="text-muted-foreground">
                  {isLogin ? t('auth.login.subtitle') : t('auth.signup.subtitle')}
                </p>
              </>
            )}
          </motion.div>

          {/* Email Confirmation Message */}
          {needsEmailConfirmation ? (
            <motion.div variants={fadeInUp} className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {t('auth.confirm.instructions')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setNeedsEmailConfirmation(false);
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    {t('auth.confirm.back')}
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={async () => {
                      // Resend confirmation email
                      const { error } = await signup(email, password);
                      if (error) {
                        toast({
                          title: language === 'ar' ? 'خطأ' : 'Error',
                          description: error,
                          variant: 'destructive',
                        });
                      } else {
                        toast({
                          title: language === 'ar' ? 'تم الإرسال' : 'Sent',
                          description: language === 'ar' 
                            ? 'تم إعادة إرسال رابط التحقق'
                            : 'Confirmation email resent',
                        });
                      }
                    }}
                  >
                    {t('auth.confirm.resend')}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Form */
            <motion.form variants={fadeInUp} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.email')}</label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`h-12 ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.password')}</label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-12 ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`h-12 ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? t('auth.submit.login') : t('auth.submit.signup')
              )}
            </Button>
          </motion.form>
          )}

          {/* Switch mode */}
          {!needsEmailConfirmation && (
          <motion.p variants={fadeInUp} className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? t('auth.switch.signup') : t('auth.switch.login')}{' '}
            <Link 
              href={isLogin ? '/auth?mode=signup' : '/auth?mode=login'}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t('nav.signup') : t('nav.login')}
            </Link>
          </motion.p>
          )}

          {/* Language toggle */}
          <motion.div variants={fadeInUp} className="mt-8 flex justify-center">
            <LanguageToggle />
          </motion.div>
        </motion.div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-16 relative overflow-hidden">
        {/* Blurred background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/register.png)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-black/20" />
        
        <motion.div 
          className="text-center text-white relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold mb-4">
            {language === 'ar' ? 'ابنِ أحلامك' : 'Build Your Dreams'}
          </h2>
          <p className="text-white/90 max-w-sm mx-auto text-lg">
            {language === 'ar' 
              ? 'صِف موقعك وشاهد السحر يحدث. لا حاجة للبرمجة.'
              : 'Describe your website and watch the magic happen. No coding required.'
            }
          </p>
        </motion.div>
      </div>
    </div>
  );
}
