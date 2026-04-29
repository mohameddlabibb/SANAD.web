import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Shield, Clock, Users, Star, Heart, Award, CheckCircle } from 'lucide-react';
const logo = '/favicon.svg';

const values = [
  { icon: Shield, key: 'verified' },
  { icon: Clock, key: 'reliable' },
  { icon: Users, key: 'professional' },
  { icon: Star, key: 'quality' },
];

const valuesText = {
  verified: { en: 'Verified Providers', ar: 'مقدمون معتمدون' },
  reliable: { en: 'Always On Time', ar: 'دائمًا في الوقت المحدد' },
  professional: { en: 'Professional Team', ar: 'فريق محترف' },
  quality: { en: 'Quality Guaranteed', ar: 'جودة مضمونة' },
};

const stats = [
  { value: '5000+', labelEn: 'Families Served', labelAr: 'عائلة خدمناها' },
  { value: '500+', labelEn: 'Verified Providers', labelAr: 'مقدم خدمة معتمد' },
  { value: '98%', labelEn: 'Satisfaction Rate', labelAr: 'نسبة الرضا' },
  { value: '24/7', labelEn: 'Support Available', labelAr: 'دعم متواصل' },
];

const features = [
  { 
    icon: CheckCircle, 
    titleEn: 'Background Verified', 
    titleAr: 'التحقق من الخلفية',
    descEn: 'All providers undergo thorough background checks and verification',
    descAr: 'جميع مقدمي الخدمات يخضعون لفحوصات خلفية شاملة والتحقق منها'
  },
  { 
    icon: Heart, 
    titleEn: 'Personalized Matching', 
    titleAr: 'مطابقة مخصصة',
    descEn: 'We match you with providers based on your specific needs and preferences',
    descAr: 'نطابقك مع مقدمي الخدمات بناءً على احتياجاتك وتفضيلاتك الخاصة'
  },
  { 
    icon: Award, 
    titleEn: 'Quality Assurance', 
    titleAr: 'ضمان الجودة',
    descEn: 'Continuous monitoring and feedback to ensure the highest service standards',
    descAr: 'مراقبة وتقييم مستمر لضمان أعلى معايير الخدمة'
  },
];

export const AboutSection = () => {
  const { t } = useTranslation();
  const { currentLanguage, isRTL } = useLanguage();
  const lang = currentLanguage as 'en' | 'ar';

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header with Logo */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img src={logo} alt="Sanad" className="h-20 w-auto" />
            <h2 className="text-4xl md:text-5xl font-heading text-foreground">
              Sanad
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {isRTL 
              ? 'منذ تأسيسنا، كرسنا أنفسنا لتقديم خدمات منزلية موثوقة واحترافية للعائلات في جميع أنحاء مصر. نحن نؤمن بأن كل عائلة تستحق راحة البال.'
              : 'Since our founding, we have dedicated ourselves to providing reliable and professional home services to families across Egypt. We believe every family deserves peace of mind.'
            }
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-primary/5 rounded-2xl p-6 text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <p className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</p>
              <p className="text-muted-foreground text-sm">{isRTL ? stat.labelAr : stat.labelEn}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Content */}
          <div className="animate-fade-in">
            <h3 className="text-3xl font-heading text-foreground mb-6">
              {t('landing.aboutTitle')}
            </h3>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {t('landing.aboutDescription')}
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {isRTL 
                ? 'نحن فريق من المحترفين الملتزمين بتحسين حياة العائلات من خلال توفير خدمات منزلية استثنائية. من مقدمي الرعاية للمسنين إلى المربيات والسائقين والطهاة، نضمن أن كل مقدم خدمة يلبي أعلى معايير الجودة والأمان.'
                : 'We are a team of professionals committed to improving family life through exceptional home services. From elderly caregivers to maids, drivers, and personal chefs, we ensure every provider meets the highest standards of quality and safety.'
              }
            </p>
            <div className="bg-accent/50 rounded-2xl p-6">
              <h4 className="font-heading text-xl text-foreground mb-2">
                {t('landing.ourMission')}
              </h4>
              <p className="text-muted-foreground">
                {t('landing.missionText')}
              </p>
            </div>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-4">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={value.key}
                  className="bg-card border border-border rounded-2xl p-6 text-center shadow-card animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h4 className="font-heading text-foreground">
                    {valuesText[value.key as keyof typeof valuesText][lang]}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-card border border-border rounded-2xl p-8 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-heading text-lg text-foreground mb-2">
                  {isRTL ? feature.titleAr : feature.titleEn}
                </h4>
                <p className="text-muted-foreground text-sm">
                  {isRTL ? feature.descAr : feature.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
