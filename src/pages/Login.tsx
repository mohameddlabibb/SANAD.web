import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { parseError } from '@/lib/parseError';
import { checkRateLimit, recordAttempt, msUntilReset } from '@/lib/rateLimiter';
const logo = '/favicon.svg';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const WINDOW = 15 * 60 * 1000;
    if (!checkRateLimit('login', 5, WINDOW)) {
      const mins = Math.ceil(msUntilReset('login', WINDOW) / 60000);
      setError(t('auth.rateLimited', `Too many attempts. Please wait ${mins} minute(s) and try again.`, { mins }));
      return;
    }

    recordAttempt('login');
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(parseError(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md shadow-card animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center mb-4">
            <img src={logo} alt="Sanad" className="h-16 w-auto" />
          </Link>
          <CardTitle className="text-2xl font-heading">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">{t('common.login')}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('common.noAccount')}{' '}
            <Link to="/signup" className="text-primary hover:underline">{t('common.signup')}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
