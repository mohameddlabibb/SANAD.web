import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, User, Bell } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
const logo = '/favicon.svg';

export const Navbar = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
            <img src={logo} alt="Sanad" className="h-12 w-auto" />
            <span className="text-xl font-heading text-foreground">Sanad</span>
          </Link>

          {/* Desktop Navigation — hidden for admin */}
          {user?.role !== 'admin' && (
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('common.home')}
              </Link>
              <Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('common.services')}
              </Link>
              {!isAuthenticated && (
                <>
                  <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('common.about')}
                  </Link>
                  <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('common.contact')}
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <>
                  <Link to="/my-requests" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('profile.myRequests')}
                  </Link>
                  <Link to="/donations" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('donations.title')}
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user?.role !== 'admin' && <LanguageSwitcher />}
            {isAuthenticated ? (
              <>
                <Link to="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    {t('common.login')}
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">
                    {t('common.signup')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button — hidden for admin */}
          {user?.role !== 'admin' && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-foreground"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}

          {/* Mobile icons for admin */}
          {user?.role === 'admin' && (
            <div className="md:hidden flex items-center gap-1">
              <Link to="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu — hidden for admin */}
        {isOpen && user?.role !== 'admin' && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-foreground hover:text-primary transition-colors px-2 py-1"
                onClick={() => setIsOpen(false)}
              >
                {t('common.home')}
              </Link>
              <Link
                to="/services"
                className="text-foreground hover:text-primary transition-colors px-2 py-1"
                onClick={() => setIsOpen(false)}
              >
                {t('common.services')}
              </Link>
              {!isAuthenticated && (
                <>
                  <Link
                    to="/about"
                    className="text-foreground hover:text-primary transition-colors px-2 py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('common.about')}
                  </Link>
                  <Link
                    to="/contact"
                    className="text-foreground hover:text-primary transition-colors px-2 py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('common.contact')}
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <>
                  <Link
                    to="/my-requests"
                    className="text-foreground hover:text-primary transition-colors px-2 py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('profile.myRequests')}
                  </Link>
                  <Link
                    to="/donations"
                    className="text-foreground hover:text-primary transition-colors px-2 py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('donations.title')}
                  </Link>
                </>
              )}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <LanguageSwitcher />
              </div>
              {isAuthenticated ? (
                <div className="flex gap-3">
                  <Link to="/notifications" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <Bell className="h-4 w-4 mr-2" />
                      {t('notifications.title')}
                    </Button>
                  </Link>
                  <Link to="/profile" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      {t('profile.settings')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link to="/login" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t('common.login')}
                    </Button>
                  </Link>
                  <Link to="/signup" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">
                      {t('common.signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
