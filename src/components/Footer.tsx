import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg mb-4">{isRTL ? 'روابط سريعة' : 'Quick Links'}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-background/70 hover:text-background transition-colors text-sm">
                  {t('common.home')}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-background/70 hover:text-background transition-colors text-sm">
                  {t('common.services')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-background/70 hover:text-background transition-colors text-sm">
                  {t('common.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-background/70 hover:text-background transition-colors text-sm">
                  {t('common.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading text-lg mb-4">{t('common.services')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/services?type=caregivers" className="text-background/70 hover:text-background transition-colors text-sm">{t('services.caregivers')}</Link>
              </li>
              <li>
                <Link to="/services?type=maid" className="text-background/70 hover:text-background transition-colors text-sm">{t('services.maid')}</Link>
              </li>
              <li>
                <Link to="/services?type=drivers" className="text-background/70 hover:text-background transition-colors text-sm">{t('services.drivers')}</Link>
              </li>
              <li>
                <Link to="/services?type=babysitters" className="text-background/70 hover:text-background transition-colors text-sm">{t('services.babysitters')}</Link>
              </li>
              <li>
                <Link to="/services?type=chefs" className="text-background/70 hover:text-background transition-colors text-sm">{t('services.chefs')}</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg mb-4">{t('common.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>hello@sanad.com</span>
              </li>
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+20 123 456 7890</span>
              </li>
              <li className="flex items-start gap-3 text-background/70 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{isRTL ? 'القاهرة، مصر' : 'Cairo, Egypt'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 text-center">
          <p className="text-background/50 text-sm">
            © 2024 Sanad. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
};
