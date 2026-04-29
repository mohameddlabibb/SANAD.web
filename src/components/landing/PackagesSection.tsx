import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const packages = [
  {
    name: { en: 'Basic', ar: 'أساسي' },
    price: { en: '2,500 EGP', ar: '٢,٥٠٠ ج.م' },
    period: { en: '/month', ar: '/شهر' },
    features: [
      { en: '20 hours of service', ar: '٢٠ ساعة خدمة' },
      { en: '1 service type', ar: 'نوع خدمة واحد' },
      { en: 'Basic support', ar: 'دعم أساسي' },
    ],
  },
  {
    name: { en: 'Standard', ar: 'قياسي' },
    price: { en: '4,500 EGP', ar: '٤,٥٠٠ ج.م' },
    period: { en: '/month', ar: '/شهر' },
    popular: true,
    features: [
      { en: '40 hours of service', ar: '٤٠ ساعة خدمة' },
      { en: '2 service types', ar: 'نوعان من الخدمات' },
      { en: 'Priority support', ar: 'دعم ذو أولوية' },
      { en: 'Flexible scheduling', ar: 'جدولة مرنة' },
    ],
  },
  {
    name: { en: 'Premium', ar: 'متميز' },
    price: { en: '8,000 EGP', ar: '٨,٠٠٠ ج.م' },
    period: { en: '/month', ar: '/شهر' },
    features: [
      { en: 'Unlimited hours', ar: 'ساعات غير محدودة' },
      { en: 'All service types', ar: 'جميع أنواع الخدمات' },
      { en: '24/7 support', ar: 'دعم على مدار الساعة' },
      { en: 'Dedicated provider', ar: 'مقدم خدمة مخصص' },
      { en: 'Same-day booking', ar: 'حجز في نفس اليوم' },
    ],
  },
];

export const PackagesSection = () => {
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const lang = currentLanguage as 'en' | 'ar';

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-4">
            {t('landing.packagesTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing.packagesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg, index) => (
            <Card 
              key={pkg.name.en}
              className={`relative border-border transition-all duration-300 hover:shadow-card animate-fade-in ${
                pkg.popular ? 'border-primary shadow-soft scale-105' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-heading">{pkg.name[lang]}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-heading text-foreground">{pkg.price[lang]}</span>
                  <span className="text-muted-foreground">{pkg.period[lang]}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-sanad-teal-light flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-foreground">{feature[lang]}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={pkg.popular ? 'default' : 'outline'}
                >
                  {t('common.bookNow')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
