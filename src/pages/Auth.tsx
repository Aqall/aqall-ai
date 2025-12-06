import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, signup, user } = useAuth();
  const { t, direction } = useLanguage();
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
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: direction === 'rtl' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match',
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
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: direction === 'rtl' ? 'نجاح' : 'Success',
        description: isLogin 
          ? (direction === 'rtl' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully')
          : (direction === 'rtl' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully'),
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Back link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            <span>{direction === 'rtl' ? 'الرئيسية' : 'Home'}</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <Logo size="lg" className="mb-6" />
            <h1 className="text-3xl font-bold mb-2">
              {isLogin ? t('auth.login.title') : t('auth.signup.title')}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? t('auth.login.subtitle') : t('auth.signup.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.email')}</label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={direction === 'rtl' ? 'pr-11' : 'pl-11'}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.password')}</label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={direction === 'rtl' ? 'pr-11' : 'pl-11'}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={direction === 'rtl' ? 'pr-11' : 'pl-11'}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? t('auth.submit.login') : t('auth.submit.signup')
              )}
            </Button>
          </form>

          {/* Switch mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? t('auth.switch.signup') : t('auth.switch.login')}{' '}
            <Link 
              to={isLogin ? '/auth?mode=signup' : '/auth?mode=login'}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t('nav.signup') : t('nav.login')}
            </Link>
          </p>

          {/* Language toggle */}
          <div className="mt-8 flex justify-center">
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-16">
        <div className="text-center text-primary-foreground">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-3xl font-bold mb-4">
            {direction === 'rtl' ? 'ابنِ أحلامك' : 'Build Your Dreams'}
          </h2>
          <p className="text-primary-foreground/70 max-w-sm mx-auto">
            {direction === 'rtl' 
              ? 'صِف موقعك وشاهد السحر يحدث. لا حاجة للبرمجة.'
              : 'Describe your website and watch the magic happen. No coding required.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
