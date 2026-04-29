// =============================================================================
// Supabase Dart Models — Auto-generated from schema snapshot 2026-03-29
// Project: shxsynfvnnndyhqqqviq (SANAD)
//
// ⚠️  ALL TABLES HAVE RLS ENABLED.
//     Every Supabase client call must use an authenticated session so the
//     JWT is forwarded automatically, OR you must pass:
//       headers: {'Authorization': 'Bearer $accessToken'}
//     when using raw http calls.
//
// Type mapping:
//   uuid          → String
//   text          → String
//   integer/int4  → int
//   numeric       → double
//   boolean/bool  → bool
//   date          → String  (ISO-8601 date, e.g. "2024-01-15")
//   time          → String  (HH:mm:ss)
//   timestamptz   → DateTime
//   text[]        → List<String>
//   jsonb         → Map<String, dynamic>
// =============================================================================

// =============================================================================
// Profile
// Table: public.profiles
// RLS: ENABLED ← requires JWT for mutations; anon can SELECT
// =============================================================================
class Profile {
  final String id;
  final String fullName;
  final String? phoneNumber;
  final String? city;
  final String? address;
  final String? avatarUrl;

  /// CHECK: 'user' | 'worker' | 'admin' — default 'user'
  final String? role;
  final double walletBalance;
  final DateTime? createdAt;
  final String nationalId;
  final String? email;
  final int? pointsBalance;
  final double? averageRating;

  const Profile({
    required this.id,
    required this.fullName,
    this.phoneNumber,
    this.city,
    this.address,
    this.avatarUrl,
    this.role,
    required this.walletBalance,
    this.createdAt,
    required this.nationalId,
    this.email,
    this.pointsBalance,
    this.averageRating,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      fullName: json['full_name'] as String,
      phoneNumber: json['phone_number'] as String?,
      city: json['city'] as String?,
      address: json['address'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String?,
      walletBalance: (json['wallet_balance'] as num).toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      nationalId: json['national_id'] as String,
      email: json['email'] as String?,
      pointsBalance: json['points_balance'] as int?,
      averageRating: json['average_rating'] != null
          ? (json['average_rating'] as num).toDouble()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (city != null) 'city': city,
      if (address != null) 'address': address,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (role != null) 'role': role,
      'wallet_balance': walletBalance,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      'national_id': nationalId,
      if (email != null) 'email': email,
      if (pointsBalance != null) 'points_balance': pointsBalance,
      if (averageRating != null) 'average_rating': averageRating,
    };
  }
}

// =============================================================================
// Worker
// Table: public.workers
// RLS: ENABLED ← requires JWT for mutations; anon/authenticated can SELECT
// FK: id → profiles(id) ON DELETE CASCADE
// =============================================================================
class Worker {
  final String id;
  final String nationalId;

  /// ISO-8601 date string, e.g. "1995-06-20"
  final String dob;

  /// CHECK: 'chef' | 'driver' | 'babysitter' | 'maid' | 'caregiver'
  final String serviceType;
  final int? yearsExperience;
  final String? nationality;
  final List<String>? languages;
  final Map<String, dynamic>? specialAttributes;
  final int? totalJobs;
  final double? averageRating;
  final double? hourlyRate;
  final double? monthlyRate;
  final String? carModel;
  final List<String>? specialTags;
  final bool? isVerified;
  final int totalReviews;

  const Worker({
    required this.id,
    required this.nationalId,
    required this.dob,
    required this.serviceType,
    this.yearsExperience,
    this.nationality,
    this.languages,
    this.specialAttributes,
    this.totalJobs,
    this.averageRating,
    this.hourlyRate,
    this.monthlyRate,
    this.carModel,
    this.specialTags,
    this.isVerified,
    required this.totalReviews,
  });

  factory Worker.fromJson(Map<String, dynamic> json) {
    return Worker(
      id: json['id'] as String,
      nationalId: json['national_id'] as String,
      dob: json['dob'] as String,
      serviceType: json['service_type'] as String,
      yearsExperience: json['years_experience'] as int?,
      nationality: json['nationality'] as String?,
      languages: json['languages'] != null
          ? List<String>.from(json['languages'] as List)
          : null,
      specialAttributes: json['special_attributes'] != null
          ? Map<String, dynamic>.from(json['special_attributes'] as Map)
          : null,
      totalJobs: json['total_jobs'] as int?,
      averageRating: json['average_rating'] != null
          ? (json['average_rating'] as num).toDouble()
          : null,
      hourlyRate: json['hourly_rate'] != null
          ? (json['hourly_rate'] as num).toDouble()
          : null,
      monthlyRate: json['monthly_rate'] != null
          ? (json['monthly_rate'] as num).toDouble()
          : null,
      carModel: json['car_model'] as String?,
      specialTags: json['special_tags'] != null
          ? List<String>.from(json['special_tags'] as List)
          : null,
      isVerified: json['is_verified'] as bool?,
      totalReviews: json['total_reviews'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'national_id': nationalId,
      'dob': dob,
      'service_type': serviceType,
      if (yearsExperience != null) 'years_experience': yearsExperience,
      if (nationality != null) 'nationality': nationality,
      if (languages != null) 'languages': languages,
      if (specialAttributes != null) 'special_attributes': specialAttributes,
      if (totalJobs != null) 'total_jobs': totalJobs,
      if (averageRating != null) 'average_rating': averageRating,
      if (hourlyRate != null) 'hourly_rate': hourlyRate,
      if (monthlyRate != null) 'monthly_rate': monthlyRate,
      if (carModel != null) 'car_model': carModel,
      if (specialTags != null) 'special_tags': specialTags,
      if (isVerified != null) 'is_verified': isVerified,
      'total_reviews': totalReviews,
    };
  }
}

// =============================================================================
// Booking
// Table: public.bookings
// RLS: ENABLED ← requires JWT for all operations
// FK: user_id → profiles(id), worker_id → workers(id)
// =============================================================================
class Booking {
  final String id;
  final String? userId;
  final String? workerId;

  /// ISO-8601 date string, e.g. "2024-01-15"
  final String bookingDate;

  /// HH:mm:ss format
  final String startTime;
  final int durationHours;
  final double totalPrice;

  /// CHECK: 'pending' | 'accepted' | 'confirmed' | 'ongoing' |
  ///        'completed' | 'cancelled' | 'paid' | 'payment_pending'
  final String? status;
  final String? notes;
  final DateTime? createdAt;

  /// CHECK: 'hour' | 'package'
  final String? bookingType;
  final int? durationValue;
  final String? address;
  final String? selectedMonths;

  const Booking({
    required this.id,
    this.userId,
    this.workerId,
    required this.bookingDate,
    required this.startTime,
    required this.durationHours,
    required this.totalPrice,
    this.status,
    this.notes,
    this.createdAt,
    this.bookingType,
    this.durationValue,
    this.address,
    this.selectedMonths,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      workerId: json['worker_id'] as String?,
      bookingDate: json['booking_date'] as String,
      startTime: json['start_time'] as String,
      durationHours: json['duration_hours'] as int,
      totalPrice: (json['total_price'] as num).toDouble(),
      status: json['status'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      bookingType: json['booking_type'] as String?,
      durationValue: json['duration_value'] as int?,
      address: json['address'] as String?,
      selectedMonths: json['selected_months'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (userId != null) 'user_id': userId,
      if (workerId != null) 'worker_id': workerId,
      'booking_date': bookingDate,
      'start_time': startTime,
      'duration_hours': durationHours,
      'total_price': totalPrice,
      if (status != null) 'status': status,
      if (notes != null) 'notes': notes,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (bookingType != null) 'booking_type': bookingType,
      if (durationValue != null) 'duration_value': durationValue,
      if (address != null) 'address': address,
      if (selectedMonths != null) 'selected_months': selectedMonths,
    };
  }
}

// =============================================================================
// Invoice
// Table: public.invoices
// RLS: ENABLED ← requires JWT for all operations
// FK: booking_id → bookings(id) ON DELETE CASCADE, user_id → profiles(id)
// =============================================================================
class Invoice {
  final String id;
  final String? bookingId;
  final String? userId;
  final double amount;

  /// CHECK: 'unpaid' | 'paid' | 'pending_approval'
  final String? status;
  final DateTime? createdAt;

  const Invoice({
    required this.id,
    this.bookingId,
    this.userId,
    required this.amount,
    this.status,
    this.createdAt,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id'] as String,
      bookingId: json['booking_id'] as String?,
      userId: json['user_id'] as String?,
      amount: (json['amount'] as num).toDouble(),
      status: json['status'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (bookingId != null) 'booking_id': bookingId,
      if (userId != null) 'user_id': userId,
      'amount': amount,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}

// =============================================================================
// Transaction
// Table: public.transactions
// RLS: ENABLED ← requires JWT for all operations
// FK: invoice_id → invoices(id), user_id → profiles(id)
// Trigger: on_payment_approved (AFTER UPDATE) → handle_payment_success()
//   ↳ When status changes 'pending' → 'approved':
//      • credits user wallet_balance
//      • inserts a points_history record
// =============================================================================
class Transaction {
  final String id;
  final String? invoiceId;
  final String? userId;

  /// CHECK: 'card' | 'instapay' | 'cash'
  final String? paymentMethod;
  final String? screenshotUrl;

  /// CHECK: 'pending' | 'approved' | 'rejected'
  final String? status;
  final DateTime? createdAt;
  final String? adminNotes;

  const Transaction({
    required this.id,
    this.invoiceId,
    this.userId,
    this.paymentMethod,
    this.screenshotUrl,
    this.status,
    this.createdAt,
    this.adminNotes,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      invoiceId: json['invoice_id'] as String?,
      userId: json['user_id'] as String?,
      paymentMethod: json['payment_method'] as String?,
      screenshotUrl: json['screenshot_url'] as String?,
      status: json['status'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      adminNotes: json['admin_notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (invoiceId != null) 'invoice_id': invoiceId,
      if (userId != null) 'user_id': userId,
      if (paymentMethod != null) 'payment_method': paymentMethod,
      if (screenshotUrl != null) 'screenshot_url': screenshotUrl,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (adminNotes != null) 'admin_notes': adminNotes,
    };
  }
}

// =============================================================================
// Donation
// Table: public.donations
// RLS: ENABLED ← requires JWT for all operations
// FK: user_id → profiles(id)
// =============================================================================
class Donation {
  final String id;
  final String? userId;
  final double amount;
  final String causeName;
  final DateTime? createdAt;

  const Donation({
    required this.id,
    this.userId,
    required this.amount,
    required this.causeName,
    this.createdAt,
  });

  factory Donation.fromJson(Map<String, dynamic> json) {
    return Donation(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      amount: (json['amount'] as num).toDouble(),
      causeName: json['cause_name'] as String,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (userId != null) 'user_id': userId,
      'amount': amount,
      'cause_name': causeName,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}

// =============================================================================
// AppNotification
// Table: public.notifications
// RLS: ENABLED ← requires JWT for all operations
// FK: receiver_id → profiles(id) ON DELETE CASCADE,
//     booking_id  → bookings(id)  ON DELETE SET NULL
// Note: named AppNotification to avoid conflict with Flutter's Notification class
// =============================================================================
class AppNotification {
  final String id;
  final String? receiverId;
  final String title;
  final String message;
  final bool? isRead;
  final DateTime? createdAt;
  final String? type;
  final String? bookingId;
  final String? actionData;

  const AppNotification({
    required this.id,
    this.receiverId,
    required this.title,
    required this.message,
    this.isRead,
    this.createdAt,
    this.type,
    this.bookingId,
    this.actionData,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      receiverId: json['receiver_id'] as String?,
      title: json['title'] as String,
      message: json['message'] as String,
      isRead: json['is_read'] as bool?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      type: json['type'] as String?,
      bookingId: json['booking_id'] as String?,
      actionData: json['action_data'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (receiverId != null) 'receiver_id': receiverId,
      'title': title,
      'message': message,
      if (isRead != null) 'is_read': isRead,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (type != null) 'type': type,
      if (bookingId != null) 'booking_id': bookingId,
      if (actionData != null) 'action_data': actionData,
    };
  }
}

// =============================================================================
// PointsHistory
// Table: public.points_history
// RLS: ENABLED ← requires JWT for all operations
// FK: user_id → profiles(id) ON DELETE CASCADE
// Note: records are also inserted automatically by the on_payment_approved trigger
// =============================================================================
class PointsHistory {
  final String id;
  final String? userId;
  final int amount;
  final String? description;
  final DateTime? createdAt;

  const PointsHistory({
    required this.id,
    this.userId,
    required this.amount,
    this.description,
    this.createdAt,
  });

  factory PointsHistory.fromJson(Map<String, dynamic> json) {
    return PointsHistory(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      amount: json['amount'] as int,
      description: json['description'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (userId != null) 'user_id': userId,
      'amount': amount,
      if (description != null) 'description': description,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}

// =============================================================================
// Feedback
// Table: public.feedback
// RLS: ENABLED ← SELECT is public (no auth needed); INSERT requires JWT
// FK: booking_id → bookings(id) ON DELETE CASCADE (UNIQUE — one review per booking)
//     user_id    → profiles(id)
//     worker_id  → workers(id)
// =============================================================================
class Feedback {
  final String id;
  final String bookingId;
  final String userId;
  final String workerId;

  /// CHECK: 1–5
  final int rating;
  final String? comment;
  final DateTime? createdAt;

  const Feedback({
    required this.id,
    required this.bookingId,
    required this.userId,
    required this.workerId,
    required this.rating,
    this.comment,
    this.createdAt,
  });

  factory Feedback.fromJson(Map<String, dynamic> json) {
    return Feedback(
      id: json['id'] as String,
      bookingId: json['booking_id'] as String,
      userId: json['user_id'] as String,
      workerId: json['worker_id'] as String,
      rating: json['rating'] as int,
      comment: json['comment'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'booking_id': bookingId,
      'user_id': userId,
      'worker_id': workerId,
      'rating': rating,
      if (comment != null) 'comment': comment,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}
