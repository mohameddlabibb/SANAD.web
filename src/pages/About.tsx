import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Shield, Clock, Users, Star, Heart, Award, CheckCircle, Target, Eye } from 'lucide-react';
const logo = '/favicon.svg';

const stats = [
  { value: '5000+', labelEn: 'Families Served', labelAr: 'عائلة خدمناها' },
  { value: '500+', labelEn: 'Verified Providers', labelAr: 'مقدم خدمة معتمد' },
  { value: '98%', labelEn: 'Satisfaction Rate', labelAr: 'نسبة الرضا' },
  { value: '24/7', labelEn: 'Support Available', labelAr: 'دعم متواصل' },
];

const values = [
  { 
    icon: Shield, 
    titleEn: 'Trust & Safety', 
    titleAr: 'الثقة والأمان',
    descEn: 'All providers undergo rigorous background checks and verification processes',
    descAr: 'جميع مقدمي الخدمات يخضعون لفحوصات خلفية صارمة وعمليات تحقق'
  },
  { 
    icon: Clock, 
    titleEn: 'Reliability', 
    titleAr: 'الموثوقية',
    descEn: 'Punctual and dependable service, every single time',
    descAr: 'خدمة دقيقة وموثوقة في كل مرة'
  },
  { 
    icon: Users, 
    titleEn: 'Professionalism', 
    titleAr: 'الاحترافية',
    descEn: 'Trained and skilled professionals dedicated to quality care',
    descAr: 'محترفون مدربون ومهرة ملتزمون بجودة الرعاية'
  },
  { 
    icon: Star, 
    titleEn: 'Excellence', 
    titleAr: 'التميز',
    descEn: 'Committed to exceeding expectations in every service',
    descAr: 'ملتزمون بتجاوز التوقعات في كل خدمة'
  },
];

const features = [
  { 
    icon: CheckCircle, 
    titleEn: 'Background Verified', 
    titleAr: 'التحقق من الخلفية',
    descEn: 'Every provider is thoroughly vetted with comprehensive background checks, reference verification, and skills assessment to ensure your family\'s safety.',
    descAr: 'يتم فحص كل مقدم خدمة بدقة من خلال فحوصات خلفية شاملة والتحقق من المراجع وتقييم المهارات لضمان سلامة عائلتك.'
  },
  { 
    icon: Heart, 
    titleEn: 'Personalized Matching', 
    titleAr: 'مطابقة مخصصة',
    descEn: 'Our smart matching system connects you with providers who best fit your specific needs, preferences, and schedule requirements.',
    descAr: 'نظام المطابقة الذكي لدينا يربطك بمقدمي الخدمات الذين يناسبون احتياجاتك وتفضيلاتك ومتطلبات جدولك.'
  },
  { 
    icon: Award, 
    titleEn: 'Quality Assurance', 
    titleAr: 'ضمان الجودة',
    descEn: 'Continuous monitoring, regular feedback collection, and performance reviews ensure consistent, high-quality service delivery.',
    descAr: 'المراقبة المستمرة وجمع التقييمات المنتظمة ومراجعات الأداء تضمن تقديم خدمة عالية الجودة باستمرار.'
  },
];

const team = [
  {
    nameEn: 'Ahmed Hassan',
    nameAr: 'أحمد حسن',
    roleEn: 'Founder & CEO',
    roleAr: 'المؤسس والرئيس التنفيذي',
  },
  {
    nameEn: 'Sara Mohamed',
    nameAr: 'سارة محمد',
    roleEn: 'Head of Operations',
    roleAr: 'رئيسة العمليات',
  },
  {
    nameEn: 'Omar Khaled',
    nameAr: 'عمر خالد',
    roleEn: 'Customer Success Lead',
    roleAr: 'رئيس نجاح العملاء',
  },
];

const About = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-accent/50 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-4 mb-6">
                <img src={logo} alt="Sanad" className="h-20 w-auto" />
                <h1 className="text-4xl md:text-5xl font-heading text-foreground">
                  Sanad
                </h1>
              </div>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {isRTL 
                  ? 'منذ تأسيسنا، كرسنا أنفسنا لتقديم خدمات منزلية موثوقة واحترافية للعائلات في جميع أنحاء مصر. نحن نؤمن بأن كل عائلة تستحق راحة البال والرعاية المتميزة.'
                  : 'Since our founding, we have dedicated ourselves to providing reliable and professional home services to families across Egypt. We believe every family deserves peace of mind and exceptional care.'
                }
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <div className="bg-background rounded-2xl p-8 shadow-card animate-fade-in">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-heading text-foreground mb-4">
                  {isRTL ? 'مهمتنا' : 'Our Mission'}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isRTL 
                    ? 'توفير خدمات منزلية عالية الجودة وموثوقة وسهلة الوصول لكل عائلة في مصر. نسعى لتمكين العائلات من العيش براحة بال من خلال ربطهم بمقدمي رعاية معتمدين ومحترفين.'
                    : 'To make quality home services accessible, reliable, and stress-free for every family in Egypt. We strive to empower families to live with peace of mind by connecting them with verified, professional care providers.'
                  }
                </p>
              </div>
              <div className="bg-background rounded-2xl p-8 shadow-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Eye className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-heading text-foreground mb-4">
                  {isRTL ? 'رؤيتنا' : 'Our Vision'}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isRTL 
                    ? 'أن نكون المنصة الرائدة والأكثر ثقة لخدمات الرعاية المنزلية في الشرق الأوسط، حيث تجد كل عائلة الدعم المناسب الذي تحتاجه.'
                    : 'To be the leading and most trusted platform for home care services in the Middle East, where every family finds the right support they need.'
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-4">
                {isRTL ? 'قيمنا' : 'Our Values'}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {isRTL 
                  ? 'المبادئ التي توجه كل ما نقوم به'
                  : 'The principles that guide everything we do'
                }
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {values.map((value, index) => (
                <div 
                  key={index}
                  className="bg-accent/50 rounded-2xl p-6 text-center animate-fade-in hover:shadow-card transition-shadow"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h4 className="font-heading text-foreground mb-2">
                    {isRTL ? value.titleAr : value.titleEn}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {isRTL ? value.descAr : value.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-4">
                {isRTL ? 'لماذا تختارنا' : 'Why Choose Sanad'}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {isRTL 
                  ? 'نقدم خدمات استثنائية مع التركيز على الجودة والأمان'
                  : 'We deliver exceptional services with a focus on quality and safety'
                }
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-background rounded-2xl p-8 shadow-card animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-6">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h4 className="text-xl font-heading text-foreground mb-3">
                    {isRTL ? feature.titleAr : feature.titleEn}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {isRTL ? feature.descAr : feature.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-4">
                {isRTL ? 'فريق القيادة' : 'Leadership Team'}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {isRTL 
                  ? 'فريق ملتزم برؤيتنا وخدمة عملائنا'
                  : 'A team committed to our vision and serving our customers'
                }
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {team.map((member, index) => (
                <div 
                  key={index}
                  className="text-center animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <h4 className="font-heading text-foreground text-lg">
                    {isRTL ? member.nameAr : member.nameEn}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {isRTL ? member.roleAr : member.roleEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
