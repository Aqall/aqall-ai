import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ArrowLeft, Loader2, Mail, Lock, Sparkles, Code2, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, signup, user } = useAuth();
  const { t, direction, language } = useLanguage();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
    } else {
      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: isLogin 
          ? (language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully')
          : (language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully'),
      });
      navigate('/dashboard');
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
              to="/" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
            >
              <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${direction === 'rtl' ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
              <span>{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-8">
            <Logo size="lg" className="mb-6" />
            <h1 className="text-3xl font-bold mb-2">
              {isLogin ? t('auth.login.title') : t('auth.signup.title')}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? t('auth.login.subtitle') : t('auth.signup.subtitle')}
            </p>
          </motion.div>

          {/* Form */}
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

          {/* Switch mode */}
          <motion.p variants={fadeInUp} className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? t('auth.switch.signup') : t('auth.switch.login')}{' '}
            <Link 
              to={isLogin ? '/auth?mode=signup' : '/auth?mode=login'}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t('nav.signup') : t('nav.login')}
            </Link>
          </motion.p>

          {/* Language toggle */}
          <motion.div variants={fadeInUp} className="mt-8 flex justify-center">
            <LanguageToggle />
          </motion.div>
        </motion.div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-16 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.05),transparent_40%)]" />
        
        {/* Floating icons */}
        <motion.div 
          className="absolute top-20 left-20"
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Code2 className="h-8 w-8 text-white/80" />
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-32 right-20"
          animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Wand2 className="h-7 w-7 text-white/80" />
          </div>
        </motion.div>

        <motion.div 
          className="absolute top-1/2 right-16"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white/80" />
          </div>
        </motion.div>
        
        <motion.div 
          className="text-center text-white relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.div
            className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-4xl font-bold mb-4">
            {language === 'ar' ? 'ابنِ أحلامك' : 'Build Your Dreams'}
          </h2>
          <p className="text-white/70 max-w-sm mx-auto text-lg">
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
