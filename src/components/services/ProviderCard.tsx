import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, BadgeCheck, Clock, Crown, Zap, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Provider {
  id: string;
  name: string;
  nameAr: string;
  service: string;
  rating: number;
  reviews: number;
  experience: number;
  price: number;
  image: string;
  verified: boolean;
  chefType?: 'premium' | 'normal';
  carModel?: string | null;
  attributes?: string[];
  overnightAvailable?: boolean;
}

interface ProviderCardProps {
  provider: Provider;
  locale: string;
  emergencyMode?: boolean;
  availableSlots?: string[];
}

export const ProviderCard = ({ provider, locale, emergencyMode, availableSlots }: ProviderCardProps) => {
  const { t } = useTranslation();
  const displayName = locale === 'ar' ? provider.nameAr : provider.name;
  const isPremiumChef = provider.service === 'chefs' && provider.chefType === 'premium';
  const href = emergencyMode ? `/provider/${provider.id}?mode=emergency` : `/provider/${provider.id}`;

  const formatAttr = (attr: string) =>
    attr.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const attrs = provider.attributes ?? [];
  const formatted = attrs.map(formatAttr);
  const show3 = formatted.slice(0, 3).join('').length <= 28;
  const visibleCount = show3 ? 3 : 2;
  const visibleAttrs = formatted.slice(0, visibleCount);
  const overflowCount = formatted.length - visibleCount;

  return (
    <Link to={href} className="block h-full">
    <Card className={`group hover:shadow-card transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full ${emergencyMode ? 'hover:border-red-400/50 ring-1 ring-red-200' : 'hover:border-primary/30'} ${isPremiumChef ? 'ring-2 ring-amber-400/50' : ''}`}>
      <CardContent className="p-0 flex flex-col h-full">
        {/* Provider Image */}
        <div className={`relative h-48 flex items-center justify-center ${isPremiumChef ? 'bg-gradient-to-br from-amber-100 to-amber-50' : emergencyMode ? 'bg-gradient-to-br from-red-50 to-red-100/30' : 'bg-gradient-to-br from-primary/10 to-primary/5'}`}>
          <div className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-heading ${isPremiumChef ? 'bg-amber-200 text-amber-800' : emergencyMode ? 'bg-red-100 text-red-700' : 'bg-primary/20 text-primary'}`}>
            {provider.image ? (
              <img src={provider.image} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              displayName.charAt(0)
            )}
          </div>
          <div className="absolute top-3 end-3 flex flex-col gap-1.5">
            {emergencyMode && (
              <Badge className="bg-red-600 text-white gap-1">
                <Zap className="h-3 w-3" />
                {t('providerDetail.emergency', 'Emergency')}
              </Badge>
            )}
            {isPremiumChef && (
              <Badge className="bg-amber-500 text-white gap-1">
                <Crown className="h-3 w-3" />
                {t('servicesPage.premium')}
              </Badge>
            )}
            {provider.verified && (
              <Badge className="bg-primary/90 text-primary-foreground gap-1">
                <BadgeCheck className="h-3 w-3" />
                {t('servicesPage.verified')}
              </Badge>
            )}
            {provider.service === 'caregivers' && provider.overnightAvailable && (
              <Badge className="bg-blue-600 text-white gap-1">
                <Moon className="h-3 w-3" />
                {t('servicesPage.overnightAvailable', 'Overnight')}
              </Badge>
            )}
          </div>
        </div>

        {/* Provider Info */}
        <div className="p-5 space-y-4 flex flex-col flex-1">
          <div>
            <h3 className="font-heading text-lg text-foreground mb-1">
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(`services.${provider.service}`)}
              {provider.chefType && ` • ${t(`servicesPage.chef${provider.chefType.charAt(0).toUpperCase() + provider.chefType.slice(1)}`)}`}
              {provider.service === 'drivers' && provider.carModel && ` • ${provider.carModel}`}
            </p>
          </div>

          {/* Available slots in emergency mode */}
          {emergencyMode && availableSlots && availableSlots.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-1.5">{t('servicesPage.availableToday', 'Available today')}</p>
              <div className="flex flex-wrap gap-1.5">
                {availableSlots.slice(0, 5).map((slot) => (
                  <span key={slot} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md font-medium">
                    {slot}
                  </span>
                ))}
                {availableSlots.length > 5 && (
                  <span className="text-xs text-muted-foreground px-1 py-0.5">+{availableSlots.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* Attributes — single row, dynamic 2-or-3 cap with overflow count */}
          {!emergencyMode && (
            <div className="flex flex-nowrap gap-1.5 min-h-[26px]">
              {visibleAttrs.map((attr) => (
                <span key={attr} className="text-xs bg-muted px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                  {attr}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-xs text-muted-foreground px-1 py-1 shrink-0">
                  +{overflowCount} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{provider.rating}</span>
              <span className="text-muted-foreground">({provider.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{provider.experience} {t('servicesPage.yearsExp')}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
            <div>
              <span className={`text-2xl font-bold ${isPremiumChef ? 'text-amber-600' : 'text-foreground'}`}>{provider.price}</span>
              <span className="text-sm text-muted-foreground"> EGP/{t('servicesPage.hour')}</span>
            </div>
            <Button size="sm" className={`rounded-xl ${emergencyMode ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}>
              {emergencyMode ? t('providerDetail.bookEmergency', 'Book Now') : t('common.bookNow')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
};
