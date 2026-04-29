# Bidding Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bidding tab to My Requests and Worker Dashboard where users post open service requests and workers submit sealed price bids; accepting a bid auto-creates a booking.

**Architecture:** Two new Supabase tables (`bidding_requests`, `bids`) with a SECURITY DEFINER RPC (`accept_bid`) for atomic accept-and-book. The feature is surfaced as a third tab in `MyRequests.tsx` (user side) and a second tab in `WorkerDashboard.tsx` (worker side). All notifications use the existing `createNotification()` function.

**Tech Stack:** React 18, TypeScript 5.8, Supabase (PostgreSQL + RLS + RPC), shadcn/ui (Tabs, Card, Badge, Button, Dialog), react-i18next, react-router-dom v6, Tailwind CSS.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/YYYYMMDD_bidding.sql` | Tables, RLS, RPC |
| Create | `src/types/biddings.ts` | TypeScript interfaces |
| Create | `src/services/biddingService.js` | All Supabase CRUD + RPC calls |
| Modify | `src/i18n/locales/en.json` | English bidding strings |
| Modify | `src/i18n/locales/ar.json` | Arabic bidding strings |
| Create | `src/components/bidding/BiddingRequestForm.tsx` | Form to post a new request |
| Create | `src/components/bidding/BidCard.tsx` | User-facing bid card (price, message, accept) |
| Create | `src/components/bidding/WorkerRequestCard.tsx` | Worker-facing open request card |
| Create | `src/components/bidding/BidSubmitForm.tsx` | Worker's price + message form |
| Create | `src/pages/BiddingRequestDetail.tsx` | Full page: request info + all bids + accept/cancel |
| Modify | `src/pages/MyRequests.tsx` | Add Bidding tab (grid-cols-3) |
| Modify | `src/pages/WorkerDashboard.tsx` | Add Bid Requests tab |
| Modify | `src/App.tsx` | Add `/bidding/:requestId` route |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260419000000_bidding.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260419000000_bidding.sql

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE bidding_requests (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type   text        NOT NULL,
  title          text        NOT NULL,
  description    text        NOT NULL,
  booking_date   date        NOT NULL,
  start_time     time        NOT NULL,
  duration_hours numeric     NOT NULL,
  address        text        NOT NULL,
  status         text        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'accepted', 'cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bids (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid        NOT NULL REFERENCES bidding_requests(id) ON DELETE CASCADE,
  worker_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_price numeric     NOT NULL,
  message        text,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, worker_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE bidding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids             ENABLE ROW LEVEL SECURITY;

-- Users: read & manage their own requests
CREATE POLICY "users_select_own_requests"
  ON bidding_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_requests"
  ON bidding_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_requests"
  ON bidding_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Workers: read open requests (any service type)
CREATE POLICY "workers_select_open_requests"
  ON bidding_requests FOR SELECT
  USING (status = 'open');

-- Bids: workers manage their own bids
CREATE POLICY "workers_insert_bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "workers_select_own_bids"
  ON bids FOR SELECT
  USING (auth.uid() = worker_id);

-- Users: read bids on their own requests
CREATE POLICY "users_select_bids_on_own_requests"
  ON bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bidding_requests
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- Users/system: update bids on their own requests (for reject-on-cancel)
CREATE POLICY "users_update_bids_on_own_requests"
  ON bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bidding_requests
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- ── RPC: accept_bid (atomic: accept + reject others + create booking) ─────────

CREATE OR REPLACE FUNCTION accept_bid(p_bid_id uuid, p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bid     bids%ROWTYPE;
  v_req     bidding_requests%ROWTYPE;
  v_book_id uuid;
BEGIN
  SELECT * INTO v_bid FROM bids            WHERE id = p_bid_id;
  SELECT * INTO v_req FROM bidding_requests WHERE id = p_request_id;

  INSERT INTO bookings (
    user_id, worker_id, booking_date, start_time,
    duration_hours, total_price, status, booking_type, address, management_fee
  ) VALUES (
    v_req.user_id, v_bid.worker_id, v_req.booking_date, v_req.start_time,
    v_req.duration_hours, v_bid.proposed_price, 'pending', 'hour', v_req.address, 50
  )
  RETURNING id INTO v_book_id;

  UPDATE bids SET status = 'accepted' WHERE id = p_bid_id;
  UPDATE bids SET status = 'rejected' WHERE request_id = p_request_id AND id != p_bid_id;
  UPDATE bidding_requests SET status = 'accepted' WHERE id = p_request_id;

  RETURN v_book_id;
END;
$$;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL above. Confirm both tables appear in the Supabase table list.

- [ ] **Step 3: Verify in Supabase dashboard**

Run this check query via `mcp__claude_ai_Supabase__execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('bidding_requests', 'bids');
```
Expected: 2 rows returned.

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/biddings.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/biddings.ts

export type BiddingRequestStatus = 'open' | 'accepted' | 'cancelled';
export type BidStatus = 'pending' | 'accepted' | 'rejected';

export interface BiddingRequest {
  id: string;
  user_id: string;
  service_type: string;
  title: string;
  description: string;
  booking_date: string;       // YYYY-MM-DD
  start_time: string;         // HH:mm:ss
  duration_hours: number;
  address: string;
  status: BiddingRequestStatus;
  created_at: string;
}

export interface Bid {
  id: string;
  request_id: string;
  worker_id: string;
  proposed_price: number;
  message: string | null;
  status: BidStatus;
  created_at: string;
}

export interface BidWithWorker extends Bid {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  worker_rating: number | null;
}

export interface BiddingRequestWithBids extends BiddingRequest {
  bids: BidWithWorker[];
}

export interface BiddingRequestWithCount extends BiddingRequest {
  bid_count: number;
}

export interface NewBiddingRequestPayload {
  user_id: string;
  service_type: string;
  title: string;
  description: string;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  address: string;
}

export interface NewBidPayload {
  request_id: string;
  worker_id: string;
  proposed_price: number;
  message?: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/biddings.ts supabase/migrations/20260419000000_bidding.sql
git commit -m "feat(bidding): add DB migration and TypeScript types"
```

---

## Task 3: Bidding Service

**Files:**
- Create: `src/services/biddingService.js`

- [ ] **Step 1: Create the service file**

```javascript
// src/services/biddingService.js
import { supabase } from '../lib/supabaseClient.js';

export async function createBiddingRequest(payload) {
  const { data, error } = await supabase
    .from('bidding_requests')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserBiddingRequests(userId) {
  const { data, error } = await supabase
    .from('bidding_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!data?.length) return [];

  // Attach bid count per request
  const ids = data.map((r) => r.id);
  const { data: counts } = await supabase
    .from('bids')
    .select('request_id')
    .in('request_id', ids);

  const countMap = {};
  (counts ?? []).forEach(({ request_id }) => {
    countMap[request_id] = (countMap[request_id] ?? 0) + 1;
  });

  return data.map((r) => ({ ...r, bid_count: countMap[r.id] ?? 0 }));
}

export async function getBiddingRequestById(requestId) {
  const { data: request, error } = await supabase
    .from('bidding_requests')
    .select('*, bids(*, profiles(full_name, avatar_url))')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  if (!request) return null;

  const bids = request.bids ?? [];
  if (!bids.length) return { ...request, bids: [] };

  const workerIds = bids.map((b) => b.worker_id);
  const { data: workers } = await supabase
    .from('workers')
    .select('id, rating')
    .in('id', workerIds);

  const ratingMap = {};
  (workers ?? []).forEach((w) => { ratingMap[w.id] = w.rating; });

  return {
    ...request,
    bids: bids
      .map((b) => ({ ...b, worker_rating: ratingMap[b.worker_id] ?? null }))
      .sort((a, b) => a.proposed_price - b.proposed_price),
  };
}

export async function getOpenRequestsForWorker(serviceType) {
  const { data, error } = await supabase
    .from('bidding_requests')
    .select('*')
    .eq('service_type', serviceType)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getWorkerBidOnRequest(requestId, workerId) {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('request_id', requestId)
    .eq('worker_id', workerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createBid(payload) {
  const { data, error } = await supabase
    .from('bids')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWorkerBids(workerId) {
  const { data, error } = await supabase
    .from('bids')
    .select('*, bidding_requests(title, service_type, booking_date, status)')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Calls the accept_bid RPC — atomic: accept bid, reject others, create booking. Returns new booking id. */
export async function acceptBid(bidId, requestId) {
  const { data, error } = await supabase
    .rpc('accept_bid', { p_bid_id: bidId, p_request_id: requestId });
  if (error) throw error;
  return data; // uuid of created booking
}

export async function cancelBiddingRequest(requestId) {
  const { error: reqErr } = await supabase
    .from('bidding_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (reqErr) throw reqErr;

  const { error: bidsErr } = await supabase
    .from('bids')
    .update({ status: 'rejected' })
    .eq('request_id', requestId)
    .eq('status', 'pending');
  if (bidsErr) throw bidsErr;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/biddingService.js
git commit -m "feat(bidding): add bidding service layer"
```

---

## Task 4: i18n Strings

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ar.json`

- [ ] **Step 1: Add English strings**

Add the following `"bidding"` key inside `src/i18n/locales/en.json` (at the top level, alongside existing keys like `"common"`, `"landing"`, etc.):

```json
"bidding": {
  "tab": "Bidding",
  "postRequest": "Post a Request",
  "myRequests": "My Bidding Requests",
  "noRequests": "You have no bidding requests yet.",
  "bidsReceived": "bids received",
  "open": "Open",
  "accepted": "Accepted",
  "cancelled": "Cancelled",
  "viewBids": "View Bids",
  "cancelRequest": "Cancel Request",
  "confirmCancel": "Are you sure you want to cancel this request? All bids will be rejected.",
  "requestDetail": "Request Details",
  "noBids": "No bids yet. Workers will be notified of your request.",
  "bidFrom": "Bid from",
  "proposed": "Proposed Price",
  "message": "Message",
  "acceptBid": "Accept",
  "accepting": "Accepting...",
  "bidAccepted": "Bid accepted! Your booking has been created.",
  "requestCancelled": "Request cancelled.",
  "workerBidRequests": "Bid Requests",
  "noOpenRequests": "No open requests for your service type right now.",
  "submitBid": "Submit Bid",
  "submitting": "Submitting...",
  "yourPrice": "Your Price (EGP)",
  "optionalMessage": "Message (optional)",
  "messagePlaceholder": "Describe your offer, experience, or any relevant details...",
  "bidSubmitted": "Your bid has been submitted.",
  "alreadyBid": "You have already submitted a bid on this request.",
  "serviceType": "Service Type",
  "title": "Title",
  "titlePlaceholder": "e.g. Need a chef for Friday dinner",
  "description": "Description",
  "descriptionPlaceholder": "Describe what you need in detail...",
  "date": "Date",
  "startTime": "Start Time",
  "duration": "Duration (hours)",
  "address": "Address",
  "posting": "Posting...",
  "post": "Post Request",
  "egp": "EGP",
  "hrs": "hrs",
  "pending": "Pending",
  "rejected": "Not Selected"
}
```

- [ ] **Step 2: Add Arabic strings**

Add the following `"bidding"` key inside `src/i18n/locales/ar.json`:

```json
"bidding": {
  "tab": "المزايدات",
  "postRequest": "نشر طلب",
  "myRequests": "طلبات المزايدة",
  "noRequests": "لا توجد طلبات مزايدة حتى الآن.",
  "bidsReceived": "عروض مستلمة",
  "open": "مفتوح",
  "accepted": "مقبول",
  "cancelled": "ملغي",
  "viewBids": "عرض العروض",
  "cancelRequest": "إلغاء الطلب",
  "confirmCancel": "هل أنت متأكد من إلغاء هذا الطلب؟ سيتم رفض جميع العروض.",
  "requestDetail": "تفاصيل الطلب",
  "noBids": "لا توجد عروض بعد. سيتم إشعار العمال بطلبك.",
  "bidFrom": "عرض من",
  "proposed": "السعر المقترح",
  "message": "رسالة",
  "acceptBid": "قبول",
  "accepting": "جارٍ القبول...",
  "bidAccepted": "تم قبول العرض! تم إنشاء حجزك.",
  "requestCancelled": "تم إلغاء الطلب.",
  "workerBidRequests": "طلبات المزايدة",
  "noOpenRequests": "لا توجد طلبات مفتوحة لنوع خدمتك الآن.",
  "submitBid": "تقديم عرض",
  "submitting": "جارٍ التقديم...",
  "yourPrice": "سعرك (جنيه)",
  "optionalMessage": "رسالة (اختياري)",
  "messagePlaceholder": "اشرح عرضك وخبرتك أو أي تفاصيل ذات صلة...",
  "bidSubmitted": "تم تقديم عرضك.",
  "alreadyBid": "لقد قدمت عرضاً على هذا الطلب بالفعل.",
  "serviceType": "نوع الخدمة",
  "title": "العنوان",
  "titlePlaceholder": "مثال: أحتاج طباخ لعشاء الجمعة",
  "description": "الوصف",
  "descriptionPlaceholder": "اشرح ما تحتاجه بالتفصيل...",
  "date": "التاريخ",
  "startTime": "وقت البدء",
  "duration": "المدة (ساعات)",
  "address": "العنوان",
  "posting": "جارٍ النشر...",
  "post": "نشر الطلب",
  "egp": "جنيه",
  "hrs": "ساعة",
  "pending": "قيد الانتظار",
  "rejected": "غير مختار"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat(bidding): add i18n strings (en + ar)"
```

---

## Task 5: BiddingRequestForm Component

**Files:**
- Create: `src/components/bidding/BiddingRequestForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/bidding/BiddingRequestForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createBiddingRequest } from '@/services/biddingService';
import { parseError } from '@/lib/parseError';
import type { NewBiddingRequestPayload } from '@/types/biddings';

const SERVICE_TYPES = ['chefs', 'drivers', 'cleaners', 'caregivers', 'maid', 'babysitters'];

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function BiddingRequestForm({ onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!serviceType || !title || !description || !bookingDate || !startTime || !durationHours || !address) {
      toast({ title: t('common.error'), description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload: NewBiddingRequestPayload = {
        user_id: user.id,
        service_type: serviceType,
        title: title.trim(),
        description: description.trim(),
        booking_date: bookingDate,
        start_time: startTime,
        duration_hours: Number(durationHours),
        address: address.trim(),
      };
      await createBiddingRequest(payload);
      toast({ title: t('bidding.bidSubmitted') });
      onSuccess();
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('bidding.serviceType')}</Label>
        <Select value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger>
            <SelectValue placeholder={t('bidding.serviceType')} />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`services.${s}`, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.title')}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('bidding.titlePlaceholder')}
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.description')}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('bidding.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('bidding.date')}</Label>
          <Input
            type="date"
            min={today}
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('bidding.startTime')}</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.duration')}</Label>
        <Input
          type="number"
          min={1}
          max={24}
          value={durationHours}
          onChange={(e) => setDurationHours(e.target.value)}
          placeholder="e.g. 3"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.address')}</Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('common.address')}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? t('bidding.posting') : t('bidding.post')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bidding/BiddingRequestForm.tsx
git commit -m "feat(bidding): add BiddingRequestForm component"
```

---

## Task 6: BidCard Component (User View)

**Files:**
- Create: `src/components/bidding/BidCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/bidding/BidCard.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink } from 'lucide-react';
import type { BidWithWorker } from '@/types/biddings';

interface Props {
  bid: BidWithWorker;
  requestIsOpen: boolean;
  onAccept: (bidId: string) => Promise<void>;
}

export function BidCard({ bid, requestIsOpen, onAccept }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(bid.id);
    } finally {
      setAccepting(false);
    }
  };

  const workerName = bid.profiles?.full_name ?? 'Worker';

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold truncate">{workerName}</span>
              {bid.worker_rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {bid.worker_rating.toFixed(1)}
                </span>
              )}
              <button
                onClick={() => navigate(`/provider/${bid.worker_id}`)}
                className="ml-auto text-muted-foreground hover:text-primary"
                title="View profile"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xl font-bold text-primary mb-1">
              {bid.proposed_price} {t('bidding.egp')}
            </p>

            {bid.message && (
              <p className="text-sm text-muted-foreground italic">"{bid.message}"</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {bid.status === 'accepted' && (
              <Badge className="bg-green-500 hover:bg-green-500">Accepted</Badge>
            )}
            {bid.status === 'rejected' && (
              <Badge variant="destructive">{t('bidding.rejected')}</Badge>
            )}
            {bid.status === 'pending' && requestIsOpen && (
              <Button size="sm" disabled={accepting} onClick={handleAccept}>
                {accepting ? t('bidding.accepting') : t('bidding.acceptBid')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bidding/BidCard.tsx
git commit -m "feat(bidding): add BidCard component"
```

---

## Task 7: Worker-Side Components

**Files:**
- Create: `src/components/bidding/WorkerRequestCard.tsx`
- Create: `src/components/bidding/BidSubmitForm.tsx`

- [ ] **Step 1: Create WorkerRequestCard**

```tsx
// src/components/bidding/WorkerRequestCard.tsx
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import type { BiddingRequest } from '@/types/biddings';

interface Props {
  request: BiddingRequest;
}

export function WorkerRequestCard({ request }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1 capitalize">{request.service_type}</p>
            <h3 className="font-semibold truncate mb-1">{request.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{request.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {request.booking_date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {request.start_time.slice(0, 5)} · {request.duration_hours}{t('bidding.hrs')}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {request.address}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/bidding/${request.id}`)}
            className="shrink-0"
          >
            {t('bidding.submitBid')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create BidSubmitForm**

```tsx
// src/components/bidding/BidSubmitForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createBid } from '@/services/biddingService';
import { createNotification } from '@/services/notificationService';
import { parseError } from '@/lib/parseError';
import type { BiddingRequest } from '@/types/biddings';

interface Props {
  request: BiddingRequest;
  onSuccess: () => void;
}

export function BidSubmitForm({ request, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !price) return;

    setLoading(true);
    try {
      await createBid({
        request_id: request.id,
        worker_id: user.id,
        proposed_price: Number(price),
        message: message.trim() || null,
      });

      await createNotification({
        receiver_id: request.user_id,
        title: 'New Bid Received',
        message: `A worker placed a bid on your request: ${request.title}`,
      });

      toast({ title: t('bidding.bidSubmitted') });
      onSuccess();
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 mt-4">
      <h3 className="font-semibold">{t('bidding.submitBid')}</h3>

      <div className="space-y-1.5">
        <Label>{t('bidding.yourPrice')}</Label>
        <Input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 350"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.optionalMessage')}</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('bidding.messagePlaceholder')}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t('bidding.submitting') : t('bidding.submitBid')}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/bidding/WorkerRequestCard.tsx src/components/bidding/BidSubmitForm.tsx
git commit -m "feat(bidding): add worker-side bidding components"
```

---

## Task 8: BiddingRequestDetail Page

**Files:**
- Create: `src/pages/BiddingRequestDetail.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/pages/BiddingRequestDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBiddingRequestById,
  acceptBid,
  cancelBiddingRequest,
} from '@/services/biddingService';
import { createNotification } from '@/services/notificationService';
import { getWorkerBidOnRequest, createBid } from '@/services/biddingService';
import { BidCard } from '@/components/bidding/BidCard';
import { BidSubmitForm } from '@/components/bidding/BidSubmitForm';
import { parseError } from '@/lib/parseError';
import type { BiddingRequestWithBids, Bid } from '@/types/biddings';

const BiddingRequestDetail = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<BiddingRequestWithBids | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [checkingBid, setCheckingBid] = useState(false);

  const isOwner = user?.id === request?.user_id;

  const load = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const data = await getBiddingRequestById(requestId);
      setRequest(data as BiddingRequestWithBids);
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [requestId]);

  useEffect(() => {
    if (!user || !requestId || isOwner) return;
    setCheckingBid(true);
    getWorkerBidOnRequest(requestId, user.id)
      .then((bid) => setExistingBid(bid))
      .finally(() => setCheckingBid(false));
  }, [user, requestId, isOwner]);

  const handleAccept = async (bidId: string) => {
    if (!requestId || !request) return;
    try {
      const bookingId = await acceptBid(bidId, requestId);

      const acceptedBid = request.bids.find((b) => b.id === bidId);
      const rejectedBids = request.bids.filter((b) => b.id !== bidId && b.status === 'pending');

      if (acceptedBid) {
        await createNotification({
          receiver_id: acceptedBid.worker_id,
          title: 'Bid Accepted',
          message: `Your bid was accepted! A booking has been created.`,
          booking_id: bookingId,
        });
      }

      for (const bid of rejectedBids) {
        await createNotification({
          receiver_id: bid.worker_id,
          title: 'Bid Not Selected',
          message: `Your bid on "${request.title}" was not selected.`,
        });
      }

      toast({ title: t('bidding.bidAccepted') });
      navigate(`/booking/${bookingId}`);
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!requestId || !request) return;
    if (!window.confirm(t('bidding.confirmCancel'))) return;
    setCancelling(true);
    try {
      await cancelBiddingRequest(requestId);

      for (const bid of request.bids.filter((b) => b.status === 'pending')) {
        await createNotification({
          receiver_id: bid.worker_id,
          title: 'Request Cancelled',
          message: `The request "${request.title}" has been cancelled.`,
        });
      }

      toast({ title: t('bidding.requestCancelled') });
      navigate('/my-requests');
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16 container mx-auto px-4">
          <p className="text-center text-muted-foreground mt-8">{t('common.loading')}</p>
        </main>
      </div>
    );
  }

  if (!request) return null;

  const statusColor: Record<string, string> = {
    open: 'bg-green-100 text-green-800',
    accepted: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <button
            onClick={() => navigate('/my-requests')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>

          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground capitalize mb-1">{request.service_type}</p>
                  <h1 className="text-xl font-bold">{request.title}</h1>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[request.status] ?? ''}`}>
                  {t(`bidding.${request.status}`)}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{request.description}</p>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {request.booking_date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {request.start_time.slice(0, 5)} · {request.duration_hours}{t('bidding.hrs')}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {request.address}
                </span>
              </div>

              {isOwner && request.status === 'open' && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancelling}
                    onClick={handleCancel}
                  >
                    {cancelling ? '...' : t('bidding.cancelRequest')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isOwner && (
            <div className="space-y-3">
              <h2 className="font-semibold">{t('bidding.tab')} ({request.bids.length})</h2>
              {request.bids.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('bidding.noBids')}</p>
              ) : (
                request.bids.map((bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    requestIsOpen={request.status === 'open'}
                    onAccept={handleAccept}
                  />
                ))
              )}
            </div>
          )}

          {!isOwner && !checkingBid && (
            existingBid ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">{t('bidding.alreadyBid')}</p>
                  <p className="text-2xl font-bold text-primary">{existingBid.proposed_price} {t('bidding.egp')}</p>
                  {existingBid.message && (
                    <p className="text-sm text-muted-foreground italic mt-1">"{existingBid.message}"</p>
                  )}
                  <Badge className="mt-2" variant="secondary">{t(`bidding.${existingBid.status}`)}</Badge>
                </CardContent>
              </Card>
            ) : request.status === 'open' ? (
              <BidSubmitForm
                request={request}
                onSuccess={() => {
                  load();
                  getWorkerBidOnRequest(requestId!, user!.id).then(setExistingBid);
                }}
              />
            ) : null
          )}
        </div>
      </main>
    </div>
  );
};

export default BiddingRequestDetail;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BiddingRequestDetail.tsx
git commit -m "feat(bidding): add BiddingRequestDetail page"
```

---

## Task 9: Add Bidding Tab to MyRequests

**Files:**
- Modify: `src/pages/MyRequests.tsx`

- [ ] **Step 1: Add state and data loading for bidding requests**

At the top of the `MyRequests` component, after the existing state declarations, add:

```tsx
// Add these imports at the top of the file:
import { getUserBiddingRequests } from '@/services/biddingService';
import { BiddingRequestForm } from '@/components/bidding/BiddingRequestForm';
import { Plus, Gavel } from 'lucide-react';
import type { BiddingRequestWithCount } from '@/types/biddings';
```

Then inside the component, after the existing state declarations:

```tsx
const [biddingRequests, setBiddingRequests] = useState<BiddingRequestWithCount[]>([]);
const [biddingLoading, setBiddingLoading] = useState(false);
const [showBiddingForm, setShowBiddingForm] = useState(false);
```

Add a load function inside the component (after the existing `useEffect`):

```tsx
const loadBiddingRequests = async () => {
  if (!user) return;
  setBiddingLoading(true);
  try {
    const data = await getUserBiddingRequests(user.id);
    setBiddingRequests(data as BiddingRequestWithCount[]);
  } catch (err) {
    console.error('bidding requests:', err);
  } finally {
    setBiddingLoading(false);
  }
};

useEffect(() => {
  loadBiddingRequests();
}, [user]);
```

- [ ] **Step 2: Change TabsList from grid-cols-2 to grid-cols-3 and add Bidding tab**

Find this line in `MyRequests.tsx`:
```tsx
<TabsList className="grid w-full grid-cols-2">
  <TabsTrigger value="upcoming">{t('profile.upcoming')}</TabsTrigger>
  <TabsTrigger value="past">{t('profile.past')}</TabsTrigger>
</TabsList>
```

Replace with:
```tsx
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="upcoming">{t('profile.upcoming')}</TabsTrigger>
  <TabsTrigger value="past">{t('profile.past')}</TabsTrigger>
  <TabsTrigger value="bidding">{t('bidding.tab')}</TabsTrigger>
</TabsList>
```

- [ ] **Step 3: Add the Bidding TabsContent**

After the closing `</TabsContent>` of the "past" tab and before the closing `</Tabs>`, add:

```tsx
<TabsContent value="bidding" className="space-y-4 mt-4">
  <div className="flex justify-between items-center">
    <h2 className="text-sm font-medium text-muted-foreground">{t('bidding.myRequests')}</h2>
    <Button size="sm" onClick={() => setShowBiddingForm(true)}>
      <Plus className="w-4 h-4 mr-1" />
      {t('bidding.postRequest')}
    </Button>
  </div>

  {showBiddingForm && (
    <Card>
      <CardContent className="p-4">
        <BiddingRequestForm
          onSuccess={() => { setShowBiddingForm(false); loadBiddingRequests(); }}
          onCancel={() => setShowBiddingForm(false)}
        />
      </CardContent>
    </Card>
  )}

  {biddingLoading ? (
    <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
  ) : biddingRequests.length === 0 ? (
    <p className="text-sm text-muted-foreground text-center py-8">{t('bidding.noRequests')}</p>
  ) : (
    biddingRequests.map((req) => (
      <Card
        key={req.id}
        className="cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => navigate(`/bidding/${req.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Gavel className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold truncate">{req.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground capitalize mb-1">{req.service_type}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {req.booking_date}
                </span>
                <span>{req.bid_count} {t('bidding.bidsReceived')}</span>
              </div>
            </div>
            <Badge
              className={
                req.status === 'open'
                  ? 'bg-green-100 text-green-800'
                  : req.status === 'accepted'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {t(`bidding.${req.status}`)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    ))
  )}
</TabsContent>
```

- [ ] **Step 4: Notify workers when a request is posted**

In `BiddingRequestForm.tsx`, after `await createBiddingRequest(payload)` succeeds, fetch all workers of that service type and notify them. Add this import and logic inside `handleSubmit`, after the `createBiddingRequest` call:

```tsx
// Add import at top of BiddingRequestForm.tsx
import { createNotification } from '@/services/notificationService';
import { supabase } from '@/lib/supabaseClient';

// Inside handleSubmit, after: await createBiddingRequest(payload);
const { data: workers } = await supabase
  .from('workers')
  .select('id')
  .eq('service_type', serviceType);

await Promise.allSettled(
  (workers ?? []).map((w) =>
    createNotification({
      receiver_id: w.id,
      title: 'New Bid Request',
      message: `New request: ${payload.title}`,
    })
  )
);
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/MyRequests.tsx src/components/bidding/BiddingRequestForm.tsx
git commit -m "feat(bidding): add Bidding tab to MyRequests with worker notifications"
```

---

## Task 10: Add Bid Requests Tab to WorkerDashboard

**Files:**
- Modify: `src/pages/WorkerDashboard.tsx`

- [ ] **Step 1: Add imports and state**

At the top of `WorkerDashboard.tsx`, add these imports alongside existing ones:

```tsx
import { getOpenRequestsForWorker } from '@/services/biddingService';
import { WorkerRequestCard } from '@/components/bidding/WorkerRequestCard';
import type { BiddingRequest } from '@/types/biddings';
```

Inside the `WorkerDashboard` component, after the existing state declarations:

```tsx
const [openRequests, setOpenRequests] = useState<BiddingRequest[]>([]);
const [requestsLoading, setRequestsLoading] = useState(false);
```

- [ ] **Step 2: Load worker's service type and open requests**

The worker's `service_type` is stored in the `workers` table. Add this data-loading effect inside the component:

```tsx
useEffect(() => {
  if (!user?.id) return;
  setRequestsLoading(true);
  supabase
    .from('workers')
    .select('service_type')
    .eq('id', user.id)
    .single()
    .then(({ data }) => {
      if (!data?.service_type) { setRequestsLoading(false); return; }
      return getOpenRequestsForWorker(data.service_type);
    })
    .then((requests) => {
      if (requests) setOpenRequests(requests as BiddingRequest[]);
    })
    .catch(console.error)
    .finally(() => setRequestsLoading(false));
}, [user?.id]);
```

Also add this import at the top of the file (alongside existing imports):
```tsx
import { supabase } from '@/lib/supabaseClient';
```

- [ ] **Step 3: Add Bid Requests tab to the existing Tabs**

In `WorkerDashboard.tsx`, find the existing `<Tabs>` structure. The current code has tabs for active/done jobs. Wrap both the existing content and the new tab:

Find:
```tsx
<Tabs defaultValue="active">
  <TabsList className="grid grid-cols-2 mb-4">
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="done">Done</TabsTrigger>
  </TabsList>
```

Replace with:
```tsx
<Tabs defaultValue="active">
  <TabsList className="grid grid-cols-3 mb-4">
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="done">Done</TabsTrigger>
    <TabsTrigger value="bid-requests">{t('bidding.workerBidRequests')}</TabsTrigger>
  </TabsList>
```

Then, before the closing `</Tabs>` tag, add:

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/WorkerDashboard.tsx
git commit -m "feat(bidding): add Bid Requests tab to WorkerDashboard"
```

---

## Task 11: Register Route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import and route**

In `src/App.tsx`, add the import after the existing page imports:

```tsx
import BiddingRequestDetail from "./pages/BiddingRequestDetail";
```

Then add the route inside `<Routes>`, before the catch-all `*` route:

```tsx
<Route path="/bidding/:requestId" element={<BiddingRequestDetail />} />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx src/pages/BiddingRequestDetail.tsx
git commit -m "feat(bidding): register /bidding/:requestId route"
```

---

## Verification Checklist

Run `npm run dev` and test end-to-end:

- [ ] **DB:** Confirm `bidding_requests` and `bids` tables exist in Supabase dashboard
- [ ] **Post request:** Log in as a user → My Requests → Bidding tab → Post a Request → fill form → submit. Verify row appears in `bidding_requests` table with `status = 'open'`
- [ ] **Worker notification:** Log in as a worker of the same service type → Worker Dashboard → Bid Requests tab → confirm the open request appears
- [ ] **Submit bid:** Worker taps Submit Bid on the request → fills price + message → submits. Verify row in `bids` table. Verify user receives a notification
- [ ] **View bids (user):** User opens request detail → confirms bid appears with worker name, price, message sorted by price ascending
- [ ] **Duplicate bid guard:** Same worker tries to bid again → form hidden, "already bid" message shown
- [ ] **Accept bid:** User accepts a bid → confirm `accept_bid` RPC runs → booking row created in `bookings` → other bids status = `'rejected'` → request status = `'accepted'` → user redirected to `/booking/:id`
- [ ] **Rejected worker notified:** Check notifications for the rejected worker(s)
- [ ] **Cancel request:** User cancels open request → request status = `'cancelled'` → all bids rejected → workers notified → user redirected to `/my-requests`
- [ ] **i18n:** Switch to Arabic → all bidding UI text translates correctly
