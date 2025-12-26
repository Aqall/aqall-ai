'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ensureProfile } from '@/lib/profileService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const handleEmailConfirmation = async () => {
      // Listen for auth state changes (Supabase auto-detects sessions)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          await ensureProfile(session.user);
          setStatus('success');
          timeoutId = setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await ensureProfile(session.user);
          setStatus('success');
          timeoutId = setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      });

      authListener = { data: { subscription } };

      // Check current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session && !sessionError && session.user) {
        await ensureProfile(session.user);
        if (mounted) {
          setStatus('success');
          timeoutId = setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
        return;
      }

      // Manually extract tokens from URL hash
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      const token_hash = hashParams.get('token_hash') || searchParams.get('token_hash');
      const type = hashParams.get('type') || searchParams.get('type') || 'email';

      // Try setting session from hash tokens
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setStatus('error');
            setErrorMessage(error.message);
          }
          return;
        }

        if (data.user && data.session) {
          await ensureProfile(data.user);
          if (mounted) {
            setStatus('success');
            timeoutId = setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
          return;
        }
      }

      // Try OTP verification with token_hash
      if (token_hash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type === 'email' ? 'email' : 'signup',
        });

        if (error) {
          console.error('OTP verification error:', error);
          if (mounted) {
            setStatus('error');
            setErrorMessage(error.message);
          }
          return;
        }

        if (data.user && data.session) {
          await ensureProfile(data.user);
          if (mounted) {
            setStatus('success');
            timeoutId = setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
          return;
        }
      }

      // If no tokens found, wait a moment for auto-detection, then show error
      setTimeout(async () => {
        if (mounted) {
          const { data: { session: finalSession } } = await supabase.auth.getSession();
          if (!finalSession) {
            console.error('No valid tokens found. Full URL:', window.location.href);
            setStatus('error');
            setErrorMessage(
              language === 'ar' 
                ? 'رابط التحقق غير صحيح أو منتهي الصلاحية. يرجى المحاولة مرة أخرى أو التحقق من أن الرابط مفتوح في المتصفح الصحيح.'
                : 'Invalid or expired confirmation link. Please try again or make sure the link opens in your browser.'
            );
          }
        }
      }, 2000);
    };

    handleEmailConfirmation();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (authListener) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [router, searchParams, language]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-6" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold">
                {language === 'ar' ? 'جارٍ التحقق...' : 'Verifying...'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'يرجى الانتظار بينما نتحقق من حسابك'
                  : 'Please wait while we verify your account'
                }
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">
                {language === 'ar' ? 'تم التحقق بنجاح!' : 'Email Verified!'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'سيتم توجيهك إلى لوحة التحكم الآن...'
                  : 'Redirecting you to the dashboard...'
                }
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">
                {language === 'ar' ? 'فشل التحقق' : 'Verification Failed'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild variant="hero">
                  <Link href="/auth?mode=login">
                    {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">
                    {language === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ConfirmEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}
