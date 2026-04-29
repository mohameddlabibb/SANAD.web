import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  { key: 'caregivers', img: '/icons/Caregiver.png', bg: 'bg-rose-50' },
  { key: 'maid', img: '/icons/Maid.png', bg: 'bg-violet-50' },
  { key: 'drivers', img: '/icons/Driver.png', bg: 'bg-blue-50' },
  { key: 'babysitters', img: '/icons/Babysitter.png', bg: 'bg-amber-50' },
  { key: 'chefs', img: '/icons/Chef.png', bg: 'bg-emerald-50' },
];

export const ServicesSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-4">
            {t('landing.servicesTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing.servicesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {services.map((service, index) => {
            return (
              <Card
                key={service.key}
                className="group cursor-pointer border-border hover:border-primary/30 transition-all duration-300 hover:shadow-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/services?type=${service.key}`)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl ${service.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <img src={service.img} alt={service.key} className="w-10 h-10 object-contain" style={{ mixBlendMode: 'multiply' }} />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-2">
                    {t(`services.${service.key}`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`services.${service.key}Desc`)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
