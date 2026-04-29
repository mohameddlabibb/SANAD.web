import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Filters {
  chefType: 'all' | 'premium' | 'normal';
  chefCuisine: string;
  chefSpecialty: string;
  driverCarOption: 'all' | 'noCar' | 'withCar';
  driverCarTypes: string[];
}

interface ServiceFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  serviceType: string;
}

const CUISINE_OPTIONS = [
  'Italian', 'Egyptian', 'Lebanese', 'Turkish', 'Indian', 'Chinese',
  'Japanese', 'Mexican', 'French', 'Greek', 'Thai', 'Mediterranean',
  'Moroccan', 'Gulf', 'American',
];

const SPECIALTY_OPTIONS = [
  'Gluten Free', 'Vegan', 'Vegetarian', 'Seafood', 'BBQ & Grills', 'Pastry & Desserts', 'Breakfast',
];

const carTypes = [
  { key: 'sedan' },
  { key: 'hatchback' },
  { key: 'family-suv' },
];

export const ServiceFilters = ({ filters, onFiltersChange, serviceType }: ServiceFiltersProps) => {
  const { t } = useTranslation();

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCarType = (carType: string) => {
    const current = filters.driverCarTypes;
    const updated = current.includes(carType)
      ? current.filter(c => c !== carType)
      : [...current, carType];
    updateFilter('driverCarTypes', updated);
  };

  const showChefFilters = serviceType === 'chefs' || serviceType === 'all';
  const showDriverFilters = serviceType === 'drivers' || serviceType === 'all';

  if (!showChefFilters && !showDriverFilters) {
    return null;
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg">{t('servicesPage.filters')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chef-specific filters */}
        {showChefFilters && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/icons/Chef.png" alt="chef" className="h-6 w-6 object-contain" style={{ mixBlendMode: 'multiply' }} />
              <Label className="font-medium">{t('servicesPage.chefFilters')}</Label>
            </div>

            {/* Chef Type */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t('servicesPage.chefType')}</Label>
              <div className="flex gap-2">
                {(['all', 'premium', 'normal'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateFilter('chefType', type)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      filters.chefType === type
                        ? type === 'premium'
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {type === 'premium' && <Crown className="h-3 w-3" />}
                    {t(`servicesPage.chef${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Cuisine</Label>
              <Select value={filters.chefCuisine} onValueChange={(v) => updateFilter('chefCuisine', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All cuisines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cuisines</SelectItem>
                  {CUISINE_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specialty filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Specialty</Label>
              <Select value={filters.chefSpecialty} onValueChange={(v) => updateFilter('chefSpecialty', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specialties</SelectItem>
                  {SPECIALTY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Divider between chef and driver filters when both are shown */}
        {showChefFilters && showDriverFilters && (
          <div className="border-t border-border" />
        )}

        {/* Driver-specific filters */}
        {showDriverFilters && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/icons/Driver.png" alt="driver" className="h-6 w-6 object-contain" style={{ mixBlendMode: 'multiply' }} />
              <Label className="font-medium">{t('servicesPage.driverFilters')}</Label>
            </div>

            {/* Car Option */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t('servicesPage.driverCarOption')}</Label>
              <div className="flex gap-2">
                {(['all', 'noCar', 'withCar'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        driverCarOption: option,
                        driverCarTypes: option !== 'withCar' ? [] : filters.driverCarTypes,
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      filters.driverCarOption === option
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {t(`servicesPage.driver${option.charAt(0).toUpperCase() + option.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Car Types — shown only when "with car" is selected */}
            {filters.driverCarOption === 'withCar' && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('servicesPage.driverCarType')}</Label>
                <div className="space-y-2">
                  {carTypes.map((car) => (
                    <div key={car.key} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id={car.key}
                        checked={filters.driverCarTypes.includes(car.key)}
                        onCheckedChange={() => toggleCarType(car.key)}
                      />
                      <label
                        htmlFor={car.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t(`servicesPage.${car.key.replace('-', '')}`)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
