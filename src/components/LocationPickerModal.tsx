import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import i18n from '@/i18n';

// Fix Leaflet's broken default icon URLs under Vite's bundler
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type Step = 'map' | 'details';
type Coords = [number, number];

const FALLBACK: Coords = [30.0444, 31.2357]; // Cairo

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': lang } }
  );
  const data = await res.json();
  const addr = data.address ?? {};
  const parts = [addr.road, addr.suburb || addr.neighbourhood || addr.city_district].filter(Boolean);
  return parts.length ? parts.join(', ') : (data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}

// Force Leaflet to recalculate tile layout after the dialog animation settles
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Auto-center on GPS position once on mount
function GpsAutoCenter({
  onLocated,
  onError,
}: {
  onLocated: (pos: Coords) => void;
  onError: () => void;
}) {
  const map = useMap();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: Coords = [pos.coords.latitude, pos.coords.longitude];
        map.setView(coords, 16);
        onLocated(coords);
      },
      () => {
        map.setView(FALLBACK, 13);
        onError();
      },
      { timeout: 8000 }
    );
  }, [map, onLocated, onError]);

  return null;
}

// Draggable marker — also repositions on map click
function DraggableMarker({
  position,
  onMove,
}: {
  position: Coords;
  onMove: (pos: Coords) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
  });

  function scheduleMove(pos: Coords) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onMove(pos), 500);
  }

  return (
    <Marker
      position={position}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (!m) return;
          const { lat, lng } = m.getLatLng();
          scheduleMove([lat, lng]);
        },
      }}
    />
  );
}

// --- Public component ---
interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (address: string) => void;
}

export function LocationPickerModal({ open, onOpenChange, onConfirm }: LocationPickerModalProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('map');
  const [coords, setCoords] = useState<Coords>(FALLBACK);
  const [streetAddress, setStreetAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [buildingNo, setBuildingNo] = useState('');
  const [aptNo, setAptNo] = useState('');

  // Reset everything when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('map');
        setCoords(FALLBACK);
        setStreetAddress('');
        setGeoError(false);
        setGpsLoading(true);
        setBuildingNo('');
        setAptNo('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  function fetchAddress(pos: Coords) {
    setGeocoding(true);
    setGeoError(false);
    reverseGeocode(pos[0], pos[1])
      .then(setStreetAddress)
      .catch(() => setGeoError(true))
      .finally(() => setGeocoding(false));
  }

  function handleLocated(pos: Coords) {
    setCoords(pos);
    setGpsLoading(false);
    fetchAddress(pos);
  }

  function handleGpsError() {
    setGpsLoading(false);
    setGeoError(true);
  }

  function handleMarkerMove(pos: Coords) {
    setCoords(pos);
    fetchAddress(pos);
  }

  function handleSave() {
    const parts = [streetAddress];
    if (buildingNo.trim()) parts.push(`Bldg ${buildingNo.trim()}`);
    if (aptNo.trim()) parts.push(`Apt ${aptNo.trim()}`);
    onConfirm(parts.join(', '));
    onOpenChange(false);
  }

  const canConfirmMap = !gpsLoading && !geocoding && streetAddress.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle>
            {step === 'map' ? t('location.pickLocation') : t('location.addressDetails')}
          </DialogTitle>
        </DialogHeader>

        {step === 'map' && (
          <>
            {/* key=open forces MapContainer to fully remount each time the modal opens */}
            <div style={{ height: 340, width: '100%' }}>
              <MapContainer
                key={open ? 'map-open' : 'map-closed'}
                center={FALLBACK}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapResizer />
                <GpsAutoCenter onLocated={handleLocated} onError={handleGpsError} />
                <DraggableMarker position={coords} onMove={handleMarkerMove} />
              </MapContainer>
            </div>

            {/* Bottom bar */}
            <div className="px-4 py-3 border-t bg-background space-y-2">
              <div className="min-h-[20px] flex items-start gap-2">
                {(gpsLoading || geocoding) && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('location.detectingLocation')}
                  </span>
                )}
                {!gpsLoading && !geocoding && geoError && (
                  <span className="text-sm text-destructive">{t('location.locationError')}</span>
                )}
                {!gpsLoading && !geocoding && !geoError && streetAddress && (
                  <span className="flex items-start gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    {t('location.deliverTo', { address: streetAddress })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('location.dragToAdjust')}</p>
              <Button className="w-full" disabled={!canConfirmMap} onClick={() => setStep('details')}>
                {t('location.confirmLocation')}
              </Button>
            </div>
          </>
        )}

        {step === 'details' && (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-sm">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span className="text-muted-foreground">{streetAddress}</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('location.buildingNo')}</label>
                <Input
                  placeholder="e.g. 42"
                  value={buildingNo}
                  onChange={(e) => setBuildingNo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('location.aptNo')}</label>
                <Input
                  placeholder="e.g. 7"
                  value={aptNo}
                  onChange={(e) => setAptNo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('map')}>
                {t('location.back')}
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                {t('location.saveAddress')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
