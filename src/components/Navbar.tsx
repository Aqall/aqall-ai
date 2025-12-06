import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.nav 
      className="fixed top-0 w-full z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-4 mt-4">
        <div className="glass-strong rounded-2xl shadow-soft">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo size="md" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageToggle />
              
              {user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      {t('nav.dashboard')}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/auth?mode=login">{t('nav.login')}</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link to="/auth?mode=signup">{t('nav.signup')}</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden border-t border-border/50 p-4 space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex justify-center mb-4">
                <LanguageToggle />
              </div>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      {t('nav.dashboard')}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link to="/auth?mode=login">{t('nav.login')}</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild className="w-full">
                    <Link to="/auth?mode=signup">{t('nav.signup')}</Link>
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
