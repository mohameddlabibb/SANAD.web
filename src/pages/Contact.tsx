import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const Contact = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(isRTL ? 'تم إرسال رسالتك بنجاح!' : 'Your message has been sent successfully!');
  };

  const contactInfo = [
    {
      icon: Mail,
      titleEn: 'Email',
      titleAr: 'البريد الإلكتروني',
      value: 'hello@sanad.com',
      descEn: 'Send us an email anytime',
      descAr: 'أرسل لنا بريدًا إلكترونيًا في أي وقت',
    },
    {
      icon: Phone,
      titleEn: 'Phone',
      titleAr: 'الهاتف',
      value: '+20 123 456 7890',
      descEn: 'Call us during business hours',
      descAr: 'اتصل بنا خلال ساعات العمل',
    },
    {
      icon: MapPin,
      titleEn: 'Address',
      titleAr: 'العنوان',
      value: isRTL ? 'القاهرة الجديدة، مصر' : 'New Cairo, Egypt',
      descEn: 'Visit our office',
      descAr: 'قم بزيارة مكتبنا',
    },
    {
      icon: Clock,
      titleEn: 'Working Hours',
      titleAr: 'ساعات العمل',
      value: isRTL ? '٩ صباحًا - ٦ مساءً' : '9 AM - 6 PM',
      descEn: 'Sunday to Thursday',
      descAr: 'من الأحد إلى الخميس',
    },
  ];

  const faqs = [
    {
      questionEn: 'How do I book a service?',
      questionAr: 'كيف أحجز خدمة؟',
      answerEn: 'Simply browse our services, select a provider, choose your preferred date and time, and confirm your booking. It\'s that easy!',
      answerAr: 'ما عليك سوى تصفح خدماتنا واختيار مقدم الخدمة والتاريخ والوقت المفضلين لديك وتأكيد حجزك. الأمر بهذه السهولة!',
    },
    {
      questionEn: 'Are all providers verified?',
      questionAr: 'هل جميع مقدمي الخدمات معتمدون؟',
      answerEn: 'Yes! All our providers undergo thorough background checks, reference verification, and skills assessment before joining our platform.',
      answerAr: 'نعم! يخضع جميع مقدمي الخدمات لدينا لفحوصات خلفية شاملة والتحقق من المراجع وتقييم المهارات قبل الانضمام إلى منصتنا.',
    },
    {
      questionEn: 'What if I need to cancel a booking?',
      questionAr: 'ماذا لو احتجت إلى إلغاء الحجز؟',
      answerEn: 'You can cancel or reschedule your booking up to 24 hours before the scheduled time without any charges.',
      answerAr: 'يمكنك إلغاء أو إعادة جدولة حجزك قبل 24 ساعة من الموعد المحدد دون أي رسوم.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-accent/50 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-heading text-foreground mb-4">
                {t('landing.contactTitle')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {isRTL 
                  ? 'نحن هنا للمساعدة. تواصل معنا وسنرد عليك في أقرب وقت ممكن.'
                  : 'We\'re here to help. Reach out to us and we\'ll get back to you as soon as possible.'
                }
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {contactInfo.map((info, index) => (
                <div 
                  key={index}
                  className="bg-muted/30 rounded-2xl p-6 text-center animate-fade-in hover:shadow-card transition-shadow"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <info.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h4 className="font-heading text-foreground mb-1">
                    {isRTL ? info.titleAr : info.titleEn}
                  </h4>
                  <p className="text-primary font-medium mb-1">{info.value}</p>
                  <p className="text-muted-foreground text-sm">
                    {isRTL ? info.descAr : info.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form & Map */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Contact Form */}
              <div className="bg-background rounded-2xl p-8 shadow-card animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-heading text-foreground">
                      {isRTL ? 'أرسل لنا رسالة' : 'Send us a Message'}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {isRTL ? 'سنرد عليك خلال 24 ساعة' : 'We\'ll respond within 24 hours'}
                    </p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {isRTL ? 'الاسم' : 'Name'}
                      </label>
                      <Input 
                        placeholder={isRTL ? 'أدخل اسمك' : 'Enter your name'} 
                        className="bg-muted/30"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {isRTL ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      <Input 
                        type="email" 
                        placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'} 
                        className="bg-muted/30"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <Input 
                      type="tel"
                      placeholder={isRTL ? 'أدخل رقم هاتفك' : 'Enter your phone number'} 
                      className="bg-muted/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {isRTL ? 'الموضوع' : 'Subject'}
                    </label>
                    <Input 
                      placeholder={isRTL ? 'موضوع الرسالة' : 'Message subject'} 
                      className="bg-muted/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {isRTL ? 'رسالتك' : 'Your Message'}
                    </label>
                    <Textarea 
                      placeholder={isRTL ? 'اكتب رسالتك هنا...' : 'Write your message here...'} 
                      rows={5}
                      className="bg-muted/30 resize-none"
                      required
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full">
                    {t('common.submit')}
                  </Button>
                </form>
              </div>

              {/* FAQs */}
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-2xl font-heading text-foreground mb-6">
                  {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
                </h3>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="bg-background rounded-2xl p-6 shadow-card">
                      <h4 className="font-heading text-foreground mb-2">
                        {isRTL ? faq.questionAr : faq.questionEn}
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {isRTL ? faq.answerAr : faq.answerEn}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Additional Help */}
                <div className="mt-8 bg-primary/5 rounded-2xl p-6">
                  <h4 className="font-heading text-foreground mb-2">
                    {isRTL ? 'هل تحتاج إلى مساعدة إضافية؟' : 'Need more help?'}
                  </h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    {isRTL 
                      ? 'فريق دعم العملاء لدينا متاح على مدار الساعة لمساعدتك.'
                      : 'Our customer support team is available around the clock to assist you.'
                    }
                  </p>
                  <Button variant="outline" className="gap-2">
                    <Phone className="h-4 w-4" />
                    {isRTL ? 'اتصل بنا الآن' : 'Call Us Now'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
