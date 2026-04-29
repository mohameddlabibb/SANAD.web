import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin } from 'lucide-react';

export const ContactSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form handling will be added with backend
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mb-4">
            {t('landing.contactTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing.contactSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading text-foreground mb-1">
                  {isRTL ? 'البريد الإلكتروني' : 'Email'}
                </h4>
                <p className="text-muted-foreground">hello@sanad.com</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading text-foreground mb-1">
                  {isRTL ? 'الهاتف' : 'Phone'}
                </h4>
                <p className="text-muted-foreground">+20 123 456 7890</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading text-foreground mb-1">
                  {isRTL ? 'العنوان' : 'Address'}
                </h4>
                <p className="text-muted-foreground">
                  {isRTL ? 'القاهرة، مصر' : 'Cairo, Egypt'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                placeholder={isRTL ? 'الاسم' : 'Name'} 
                className="bg-background"
              />
              <Input 
                type="email" 
                placeholder={isRTL ? 'البريد الإلكتروني' : 'Email'} 
                className="bg-background"
              />
            </div>
            <Input 
              placeholder={isRTL ? 'الموضوع' : 'Subject'} 
              className="bg-background"
            />
            <Textarea 
              placeholder={isRTL ? 'رسالتك' : 'Your message'} 
              rows={5}
              className="bg-background resize-none"
            />
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              {t('common.submit')}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
