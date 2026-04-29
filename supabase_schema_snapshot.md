# Supabase Schema Snapshot
**Project:** madylabib@gmail.com's Project (`shxsynfvnnndyhqqqviq`)
**Region:** eu-west-1 | **Postgres:** 17.6.1 | **Generated:** 2026-03-29

> ⚠️ **ALL 9 tables have RLS enabled** — every Flutter HTTP/Supabase call must include the authenticated user's JWT (`Authorization: Bearer <token>`).

---

## Tables

### `profiles`
> RLS: ✅ Enabled | Rows: ~4

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | — | PK, FK → auth.users(id) |
| `full_name` | text | NOT NULL | — | |
| `phone_number` | text | NULL | — | |
| `city` | text | NULL | — | |
| `address` | text | NULL | — | |
| `avatar_url` | text | NULL | — | |
| `role` | text | NULL | `'user'` | CHECK: `user`, `worker`, `admin` |
| `wallet_balance` | numeric | NOT NULL | `0` | |
| `created_at` | timestamptz | NULL | `now()` | |
| `national_id` | text | NOT NULL | — | UNIQUE |
| `email` | text | NULL | — | |
| `points_balance` | integer | NULL | `0` | |
| `average_rating` | numeric | NULL | `5.0` | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Public can view profiles | SELECT | anon | `true` |
| Users can insert own profile | INSERT | public | `auth.uid() = id` |
| profiles_insert_own | INSERT | authenticated | `auth.uid() = id` |
| Users can update their own profile | UPDATE | authenticated | `auth.uid() = id` |
| profiles_update_own | UPDATE | authenticated | `auth.uid() = id` |
| admin_update_all_profiles | UPDATE | public | `is_admin()` |
| Users can view their own profile | SELECT | authenticated | `auth.uid() = id` |
| profiles_select_authenticated | SELECT | authenticated | `true` |

---

### `workers`
> RLS: ✅ Enabled | Rows: ~1

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | — | PK, FK → profiles(id) CASCADE |
| `national_id` | text | NOT NULL | — | UNIQUE |
| `dob` | date | NOT NULL | — | |
| `service_type` | text | NOT NULL | — | CHECK: `chef`, `driver`, `babysitter`, `maid`, `caregiver` |
| `years_experience` | integer | NULL | `0` | |
| `nationality` | text | NULL | — | |
| `languages` | text[] | NULL | — | |
| `special_attributes` | jsonb | NULL | — | |
| `total_jobs` | integer | NULL | `0` | |
| `average_rating` | numeric | NULL | `0.0` | |
| `hourly_rate` | numeric | NULL | — | |
| `monthly_rate` | numeric | NULL | — | |
| `car_model` | text | NULL | — | |
| `special_tags` | text[] | NULL | — | |
| `is_verified` | boolean | NULL | `false` | |
| `total_reviews` | integer | NOT NULL | `0` | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Public can view workers | SELECT | anon | `true` |
| Authenticated users can view workers | SELECT | public | `auth.role() = 'authenticated'` |
| workers_select_authenticated | SELECT | authenticated | `true` |
| Workers can read own row | SELECT | public | `auth.uid() = id` |
| Workers can insert own row | INSERT | public | `auth.uid() = id` |
| Workers can update own row | UPDATE | public | `auth.uid() = id` |
| workers_update_own | UPDATE | authenticated | `auth.uid() = id` |
| Admins can update workers | UPDATE | public | profile role = admin |

---

### `bookings`
> RLS: ✅ Enabled | Rows: ~13

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NULL | — | FK → profiles(id) RESTRICT |
| `worker_id` | uuid | NULL | — | FK → workers(id) RESTRICT |
| `booking_date` | date | NOT NULL | — | |
| `start_time` | time | NOT NULL | — | |
| `duration_hours` | integer | NOT NULL | — | |
| `total_price` | numeric | NOT NULL | — | |
| `status` | text | NULL | `'pending'` | CHECK: `pending`, `accepted`, `confirmed`, `ongoing`, `completed`, `cancelled`, `paid`, `payment_pending` |
| `notes` | text | NULL | — | |
| `created_at` | timestamptz | NULL | `now()` | |
| `booking_type` | text | NULL | — | CHECK: `hour`, `package` |
| `duration_value` | integer | NULL | — | |
| `address` | text | NULL | — | |
| `selected_months` | text | NULL | — | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Users can read own bookings | SELECT | public | `auth.uid() = user_id` |
| Users can view own bookings | SELECT | public | `auth.uid() = user_id` |
| bookings_select_own | SELECT | authenticated | `auth.uid() = user_id OR auth.uid() = worker_id` |
| Workers can read their bookings | SELECT | public | `auth.uid() = worker_id` |
| admin_select_all_bookings | SELECT | public | role = admin |
| Users can insert bookings | INSERT | public | `auth.uid() = user_id` |
| bookings_insert_own | INSERT | authenticated | `auth.uid() = user_id` |
| Workers can update booking status | UPDATE | public | `auth.uid() = worker_id` |
| bookings_update_own | UPDATE | authenticated | `auth.uid() = user_id OR auth.uid() = worker_id` |
| admin_update_all_bookings | UPDATE | public | role = admin |
| Users can cancel own bookings | DELETE | public | `auth.uid() = user_id` |

---

### `invoices`
> RLS: ✅ Enabled | Rows: ~10

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `booking_id` | uuid | NULL | — | FK → bookings(id) CASCADE |
| `user_id` | uuid | NULL | — | FK → profiles(id) |
| `amount` | numeric | NOT NULL | — | |
| `status` | text | NULL | `'unpaid'` | CHECK: `unpaid`, `paid`, `pending_approval` |
| `created_at` | timestamptz | NULL | `now()` | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Users can view own invoices | SELECT | public | `auth.uid() = user_id` |
| invoices_select_own | SELECT | authenticated | `auth.uid() = user_id` |
| admin_select_all_invoices | SELECT | public | role = admin |
| Users can insert invoices | INSERT | public | `auth.uid() = user_id` |
| invoices_insert_own | INSERT | authenticated | `auth.uid() = user_id` |

---

### `transactions`
> RLS: ✅ Enabled | Rows: ~10

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `invoice_id` | uuid | NULL | — | FK → invoices(id) |
| `user_id` | uuid | NULL | — | FK → profiles(id) |
| `payment_method` | text | NULL | — | CHECK: `card`, `instapay`, `cash` |
| `screenshot_url` | text | NULL | — | |
| `status` | text | NULL | `'pending'` | CHECK: `pending`, `approved`, `rejected` |
| `created_at` | timestamptz | NULL | `now()` | |
| `admin_notes` | text | NULL | — | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Users can view own transactions | SELECT | public | `auth.uid() = user_id` |
| transactions_select_own | SELECT | authenticated | `auth.uid() = user_id` |
| admin_select_all_transactions | SELECT | authenticated | `is_admin()` |
| Users can insert transactions | INSERT | public | `auth.uid() = user_id` |
| transactions_insert_own | INSERT | authenticated | `auth.uid() = user_id` |
| admin_update_all_transactions | UPDATE | authenticated | `is_admin()` |

---

### `donations`
> RLS: ✅ Enabled | Rows: 0

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NULL | — | FK → profiles(id) |
| `amount` | numeric | NOT NULL | — | |
| `cause_name` | text | NOT NULL | — | |
| `created_at` | timestamptz | NULL | `now()` | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Users can view own donations | SELECT | public | `auth.uid() = user_id` |
| donations_select_own | SELECT | authenticated | `auth.uid() = user_id` |
| Users can insert donations | INSERT | public | `auth.uid() = user_id` |
| donations_insert_own | INSERT | authenticated | `auth.uid() = user_id` |

---

### `notifications`
> RLS: ✅ Enabled | Rows: ~22

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `receiver_id` | uuid | NULL | — | FK → profiles(id) CASCADE |
| `title` | text | NOT NULL | — | |
| `message` | text | NOT NULL | — | |
| `is_read` | boolean | NULL | `false` | |
| `created_at` | timestamptz | NULL | `now()` | |
| `type` | text | NULL | — | |
| `booking_id` | uuid | NULL | — | FK → bookings(id) SET NULL |
| `action_data` | text | NULL | — | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Users can view own notifications | SELECT | public | `auth.uid() = receiver_id` |
| notifications_select_own | SELECT | authenticated | `auth.uid() = receiver_id` |
| Authenticated users can insert notifications | INSERT | authenticated | `true` |
| Users can update own notifications | UPDATE | public | `auth.uid() = receiver_id` |
| notifications_update_own | UPDATE | authenticated | `auth.uid() = receiver_id` |

---

### `points_history`
> RLS: ✅ Enabled | Rows: ~5

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NULL | — | FK → profiles(id) CASCADE |
| `amount` | integer | NOT NULL | — | |
| `description` | text | NULL | — | |
| `created_at` | timestamptz | NULL | `now()` | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Users can view own points | SELECT | public | `auth.uid() = user_id` |
| points_history_select_own | SELECT | authenticated | `auth.uid() = user_id` |
| admin_select_all_points_history | SELECT | authenticated | `is_admin()` |
| users_insert_own_points_history | INSERT | public | `auth.uid() = user_id` |
| admin_insert_points_history | INSERT | authenticated | `is_admin()` |

---

### `feedback`
> RLS: ✅ Enabled | Rows: ~1

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `booking_id` | uuid | NOT NULL | — | FK → bookings(id) CASCADE, UNIQUE |
| `user_id` | uuid | NOT NULL | — | FK → profiles(id) |
| `worker_id` | uuid | NOT NULL | — | FK → workers(id) |
| `rating` | integer | NOT NULL | — | CHECK: 1–5 |
| `comment` | text | NULL | — | |
| `created_at` | timestamptz | NULL | `now()` | |

**RLS Policies:**
| Policy | Cmd | Roles | Rule |
|---|---|---|---|
| Anyone can read feedback | SELECT | public | `true` |
| Users can insert their own feedback | INSERT | public | `auth.uid() = user_id` |

---

## Foreign Key Relationships

| From Table | Column | → To Table | Column | On Delete |
|---|---|---|---|---|
| `profiles` | `id` | `auth.users` | `id` | CASCADE |
| `workers` | `id` | `profiles` | `id` | CASCADE |
| `bookings` | `user_id` | `profiles` | `id` | RESTRICT |
| `bookings` | `worker_id` | `workers` | `id` | RESTRICT |
| `invoices` | `booking_id` | `bookings` | `id` | CASCADE |
| `invoices` | `user_id` | `profiles` | `id` | NO ACTION |
| `transactions` | `invoice_id` | `invoices` | `id` | NO ACTION |
| `transactions` | `user_id` | `profiles` | `id` | NO ACTION |
| `donations` | `user_id` | `profiles` | `id` | NO ACTION |
| `notifications` | `receiver_id` | `profiles` | `id` | CASCADE |
| `notifications` | `booking_id` | `bookings` | `id` | SET NULL |
| `points_history` | `user_id` | `profiles` | `id` | CASCADE |
| `feedback` | `booking_id` | `bookings` | `id` | CASCADE |
| `feedback` | `user_id` | `profiles` | `id` | NO ACTION |
| `feedback` | `worker_id` | `workers` | `id` | NO ACTION |

---

## Database Functions

### `is_admin()` → bool
- **Language:** SQL | **Volatility:** STABLE | **Security:** DEFINER
- **Purpose:** Returns `true` if the calling user has `role = 'admin'` in profiles.
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND role = 'admin'
);
```

### `handle_new_user()` → trigger
- **Language:** PL/pgSQL | **Volatility:** VOLATILE | **Security:** DEFINER
- **Purpose:** On new auth user signup, inserts a row into `profiles`.
```sql
BEGIN
  INSERT INTO public.profiles (id, full_name, role, national_id, wallet_balance)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'user',
    COALESCE(new.raw_user_meta_data->>'national_id', ''),
    0
  );
  RETURN new;
END;
```

### `handle_payment_success()` → trigger
- **Language:** PL/pgSQL | **Volatility:** VOLATILE | **Security:** INVOKER
- **Purpose:** When a transaction is approved, credits the user's `wallet_balance` and inserts a `points_history` record.
```sql
IF (NEW.status = 'approved' AND OLD.status = 'pending') THEN
    SELECT amount INTO payment_amount FROM invoices WHERE id = NEW.invoice_id;
    UPDATE profiles SET wallet_balance = wallet_balance + payment_amount WHERE id = NEW.user_id;
    INSERT INTO points_history (user_id, amount, description)
    VALUES (NEW.user_id, payment_amount, 'Earned from payment approval');
END IF;
```

---

## Triggers

| Trigger | Table | Event | Timing | Orientation | Function |
|---|---|---|---|---|---|
| `on_payment_approved` | `transactions` | UPDATE | AFTER | ROW | `handle_payment_success()` |

> Note: A trigger on `auth.users` calling `handle_new_user()` likely exists in the `auth` schema (not visible in `public`).

---

## Enums & Custom Types

No dedicated `ENUM` types exist in the `public` schema. All constrained columns use `text` with `CHECK` constraints:

| Table | Column | Allowed Values |
|---|---|---|
| `profiles` | `role` | `user`, `worker`, `admin` |
| `workers` | `service_type` | `chef`, `driver`, `babysitter`, `maid`, `caregiver` |
| `bookings` | `status` | `pending`, `accepted`, `confirmed`, `ongoing`, `completed`, `cancelled`, `paid`, `payment_pending` |
| `bookings` | `booking_type` | `hour`, `package` |
| `invoices` | `status` | `unpaid`, `paid`, `pending_approval` |
| `transactions` | `payment_method` | `card`, `instapay`, `cash` |
| `transactions` | `status` | `pending`, `approved`, `rejected` |
| `feedback` | `rating` | integer 1–5 |

---

## Indexes

| Table | Index Name | Type | Columns |
|---|---|---|---|
| `profiles` | `profiles_pkey` | UNIQUE BTREE | `id` |
| `profiles` | `profiles_national_id_key` | UNIQUE BTREE | `national_id` |
| `workers` | `workers_pkey` | UNIQUE BTREE | `id` |
| `workers` | `workers_national_id_key` | UNIQUE BTREE | `national_id` |
| `bookings` | `bookings_pkey` | UNIQUE BTREE | `id` |
| `bookings` | `idx_bookings_user` | BTREE | `(user_id, status)` |
| `bookings` | `idx_bookings_worker` | BTREE | `(worker_id, status)` |
| `invoices` | `invoices_pkey` | UNIQUE BTREE | `id` |
| `invoices` | `idx_invoices_booking` | BTREE | `booking_id` |
| `transactions` | `transactions_pkey` | UNIQUE BTREE | `id` |
| `donations` | `donations_pkey` | UNIQUE BTREE | `id` |
| `notifications` | `notifications_pkey` | UNIQUE BTREE | `id` |
| `notifications` | `idx_notifications_receiver` | BTREE | `(receiver_id, is_read)` |
| `points_history` | `points_history_pkey` | UNIQUE BTREE | `id` |
| `feedback` | `feedback_pkey` | UNIQUE BTREE | `id` |
| `feedback` | `feedback_booking_id_key` | UNIQUE BTREE | `booking_id` |

---

## RLS Summary — Flutter Auth Requirements

| Table | RLS | Auth Required |
|---|---|---|
| `profiles` | ✅ | Yes — anon can SELECT all, but mutations need JWT |
| `workers` | ✅ | Yes — anon can SELECT, mutations need JWT |
| `bookings` | ✅ | Yes — all operations need JWT |
| `invoices` | ✅ | Yes — all operations need JWT |
| `transactions` | ✅ | Yes — all operations need JWT |
| `donations` | ✅ | Yes — all operations need JWT |
| `notifications` | ✅ | Yes — all operations need JWT |
| `points_history` | ✅ | Yes — all operations need JWT |
| `feedback` | ✅ | Yes — SELECT is public, INSERT needs JWT |
