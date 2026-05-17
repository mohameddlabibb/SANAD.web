import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { parseError } from '@/lib/parseError';
const logo = '/favicon.svg';

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!gender) {
      setError(t('auth.genderRequired', 'Please select your gender.'));
      return;
    }

    try {
      await signup(name, email, phone, password, nationalId, gender);
      navigate('/');
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
          <CardTitle className="text-2xl font-heading">{t('auth.signupTitle')}</CardTitle>
          <CardDescription>{t('auth.signupSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              placeholder={t('auth.namePlaceholder')} 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input 
              type="email" 
              placeholder={t('auth.emailPlaceholder')} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="tel"
              placeholder={t('auth.phonePlaceholder')}
              value={phone}
              maxLength={11}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            />
            <Input
              placeholder={t('auth.nationalIdPlaceholder')}
              value={nationalId}
              maxLength={14}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
            />
            <div className="flex gap-6">
              {['Male', 'Female'].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-sm">{t(`auth.gender_${g.toLowerCase()}`, g)}</span>
                </label>
              ))}
            </div>
            <Input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">{t('common.signup')}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('common.hasAccount')}{' '}
            <Link to="/login" className="text-primary hover:underline">{t('common.login')}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
