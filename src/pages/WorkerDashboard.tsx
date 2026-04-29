import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, ArrowRight, MapPin, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getWorkerBookings, updateBookingStatus, cancelBooking } from '@/services/bookingService';
import { getOpenRequestsForWorker } from '@/services/biddingService';
import { uploadWorkerDocument, saveWorkerDocumentRecord, getWorkerDocuments } from '@/services/adminService';
import { createNotification } from '@/services/notificationService';
import { parseError } from '@/lib/parseError';
import { supabase } from '@/lib/supabaseClient';
import { WorkerRequestCard } from '@/components/bidding/WorkerRequestCard';
import type { BiddingRequest } from '@/types/biddings';

interface BookingRow {
  id: string;
  user_id: string;
  booking_date: string;
  start_time: string | null;
  duration_hours: number | null;
  total_price: number | null;
  status: string;
  booking_type: string | null;
  notes: string | null;
  address: string | null;
  profiles: { full_name: string | null; phone_number: string | null } | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const NEXT_STATUS: Record<string, string> = {
  pending: 'accepted',
  accepted: 'ongoing',
  ongoing: 'completed',
};

const NEXT_LABEL: Record<string, string> = {
  pending: 'Accept',
  accepted: 'Start Service',
  ongoing: 'Mark Completed',
};

const WorkerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [openRequests, setOpenRequests] = useState<BiddingRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [workerServiceType, setWorkerServiceType] = useState<string | null>(null);
  const [documentsSubmitted, setDocumentsSubmitted] = useState<boolean | null>(null);
  const [workerDocs, setWorkerDocs] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getWorkerBookings(user.id);
      setBookings(data as BookingRow[]);
    } catch (err) {
      toast({ title: 'Error loading bookings', description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!user?.id) return;
    setRequestsLoading(true);
    supabase
      .from('workers')
      .select('service_type, documents_submitted')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data?.service_type) { setRequestsLoading(false); return; }
        setWorkerServiceType(data.service_type);
        setDocumentsSubmitted(data.documents_submitted ?? false);
        return getOpenRequestsForWorker(data.service_type);
      })
      .then((requests) => {
        if (requests) setOpenRequests(requests as BiddingRequest[]);
      })
      .catch(console.error)
      .finally(() => setRequestsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    getWorkerDocuments(user.id).then(setWorkerDocs).catch(console.error);
  }, [user?.id]);

  const handleCancel = async (bookingId: string) => {
    setUpdating(bookingId);
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      await cancelBooking(bookingId, { userId: booking?.user_id });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
      toast({ title: 'Booking cancelled' });
    } catch (err) {
      toast({ title: 'Cancel failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      await updateBookingStatus(bookingId, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      if (newStatus === 'completed' && booking?.user_id) {
        await createNotification({
          receiver_id: booking.user_id,
          title: 'Service Completed',
          message: `${booking.booking_type ?? 'Service'} completed! Ready to pay?`,
          booking_id: bookingId,
        });
      }
      toast({ title: `Booking ${newStatus}` });
    } catch (err) {
      toast({ title: 'Update failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  const handleDocUpload = async (
    docType: 'national_id' | 'driving_license',
    side: 'front' | 'back',
    file?: File,
  ) => {
    if (!file || !user?.id) return;
    const existingDoc = workerDocs.find((d) => d.document_type === docType);
    if (side === 'back' && !existingDoc?.front_url) {
      toast({ title: 'Upload front side first', variant: 'destructive' });
      return;
    }
    setUploadingDoc(true);
    try {
      const url = await uploadWorkerDocument(user.id, docType, file, side);
      await saveWorkerDocumentRecord({
        worker_id: user.id,
        document_type: docType,
        front_url: side === 'front' ? url : existingDoc!.front_url,
        back_url: side === 'back' ? url : existingDoc?.back_url,
      });
      const updated = await getWorkerDocuments(user.id);
      setWorkerDocs(updated);
      // Banner disappears immediately once national ID front is uploaded
      if (docType === 'national_id' && side === 'front') {
        setDocumentsSubmitted(true);
      }
      toast({ title: 'Document uploaded successfully' });
    } catch (e) {
      toast({ title: 'Upload failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const active = bookings.filter((b) => ['pending', 'accepted', 'ongoing'].includes(b.status));
  const done = bookings.filter((b) => ['completed', 'cancelled'].includes(b.status));

  const BookingCard = ({ booking }: { booking: BookingRow }) => {
    const next = NEXT_STATUS[booking.status];
    const nextLabel = NEXT_LABEL[booking.status];

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  {booking.profiles?.full_name ?? 'Unknown client'}
                </span>
                {booking.profiles?.phone_number && (
                  <span className="text-xs text-muted-foreground">· {booking.profiles.phone_number}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {booking.booking_date}
                </span>
                {booking.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {booking.start_time.slice(0, 5)}
                  </span>
                )}
                {booking.duration_hours && (
                  <span>{booking.duration_hours}h</span>
                )}
                {booking.total_price != null && (
                  <span className="font-medium text-foreground">{booking.total_price} EGP</span>
                )}
              </div>
              {booking.notes && (
                <p className="mt-2 text-xs text-muted-foreground italic">"{booking.notes}"</p>
              )}
              {booking.address && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {booking.address}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[booking.status] ?? 'bg-gray-100 text-gray-800'}`}>
                {booking.status}
              </span>
              {next && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updating === booking.id}
                  onClick={() => handleStatusUpdate(booking.id, next)}
                  className="gap-1 text-xs"
                >
                  {nextLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {['pending', 'accepted', 'deposit_pending', 'deposit_paid'].includes(booking.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={updating === booking.id}
                  onClick={() => handleCancel(booking.id)}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-heading font-bold mb-6">My Bookings</h1>

          {/* Document pending banner */}
          {documentsSubmitted === false && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Your profile is not visible to clients yet</p>
                <p className="text-xs mt-0.5 text-amber-700">
                  Upload your National ID document from the{' '}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => {
                      const el = document.querySelector('[data-tab="documents"]') as HTMLElement;
                      el?.click();
                    }}
                  >
                    Documents tab
                  </button>{' '}
                  to start receiving bookings.
                </p>
              </div>
              <FileText className="w-5 h-5 shrink-0 text-amber-400" />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center pt-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="active">
                  Active
                  {active.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{active.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="done">Completed / Cancelled</TabsTrigger>
                <TabsTrigger value="bid-requests">{t('bidding.workerBidRequests')}</TabsTrigger>
                <TabsTrigger value="documents" data-tab="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-3">
                {active.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No active bookings
                    </CardContent>
                  </Card>
                ) : (
                  active.map((b) => <BookingCard key={b.id} booking={b} />)
                )}
              </TabsContent>

              <TabsContent value="done" className="space-y-3">
                {done.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No completed bookings yet
                    </CardContent>
                  </Card>
                ) : (
                  done.map((b) => <BookingCard key={b.id} booking={b} />)
                )}
              </TabsContent>

              <TabsContent value="bid-requests" className="space-y-3">
                {requestsLoading ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t('common.loading')}</p>
                ) : openRequests.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t('bidding.noOpenRequests')}</p>
                ) : (
                  openRequests.map((req) => (
                    <WorkerRequestCard key={req.id} request={req} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="documents">
                <div className="space-y-4 p-4">
                  <h3 className="font-semibold">My Documents</h3>
                  {uploadingDoc && (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  )}

                  {/* National ID */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">National ID Card</h4>
                      {workerDocs.find((d) => d.document_type === 'national_id') && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Uploaded</span>
                      )}
                    </div>
                    {workerDocs.find((d) => d.document_type === 'national_id')?.front_url && (
                      <a
                        href={workerDocs.find((d) => d.document_type === 'national_id').front_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View front
                      </a>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Front</Label>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          className="text-xs mt-1"
                          disabled={uploadingDoc}
                          onChange={(e) => handleDocUpload('national_id', 'front', e.target.files?.[0])}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Back</Label>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          className="text-xs mt-1"
                          disabled={uploadingDoc}
                          onChange={(e) => handleDocUpload('national_id', 'back', e.target.files?.[0])}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Driving License — only for drivers */}
                  {workerServiceType === 'driver' && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Driving License</h4>
                        {workerDocs.find((d) => d.document_type === 'driving_license') && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Uploaded</span>
                        )}
                      </div>
                      {workerDocs.find((d) => d.document_type === 'driving_license')?.front_url && (
                        <a
                          href={workerDocs.find((d) => d.document_type === 'driving_license').front_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          View front
                        </a>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Front</Label>
                          <Input
                            type="file"
                            accept="image/*,application/pdf"
                            className="text-xs mt-1"
                            disabled={uploadingDoc}
                            onChange={(e) => handleDocUpload('driving_license', 'front', e.target.files?.[0])}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Back</Label>
                          <Input
                            type="file"
                            accept="image/*,application/pdf"
                            className="text-xs mt-1"
                            disabled={uploadingDoc}
                            onChange={(e) => handleDocUpload('driving_license', 'back', e.target.files?.[0])}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default WorkerDashboard;
