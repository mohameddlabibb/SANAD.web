export const CAREGIVER_MEDICAL_SKILLS = [
  'basic_nursing',
  'first_aid',
  'injections',
  'cpr_artificial_respiration',
  'wound_stitching',
  'medication_management',
  'blood_pressure_monitoring',
  'blood_sugar_monitoring',
  'catheter_care',
  'physiotherapy_basics',
] as const;

export type CaregiverMedicalSkill = (typeof CAREGIVER_MEDICAL_SKILLS)[number];

export const CAREGIVER_MEDICAL_SKILL_LABELS: Record<
  CaregiverMedicalSkill,
  { en: string; ar: string }
> = {
  basic_nursing:               { en: 'Basic Nursing',               ar: 'تمريض أساسي' },
  first_aid:                   { en: 'First Aid',                   ar: 'إسعافات أولية' },
  injections:                  { en: 'Injections / Shots',          ar: 'حقن' },
  cpr_artificial_respiration:  { en: 'CPR / Artificial Respiration', ar: 'إنعاش قلبي رئوي' },
  wound_stitching:             { en: 'Wound Stitching',             ar: 'خياطة الجروح' },
  medication_management:       { en: 'Medication Management',       ar: 'إدارة الأدوية' },
  blood_pressure_monitoring:   { en: 'Blood Pressure Monitoring',   ar: 'قياس ضغط الدم' },
  blood_sugar_monitoring:      { en: 'Blood Sugar Monitoring',      ar: 'قياس السكر' },
  catheter_care:               { en: 'Catheter Care',               ar: 'رعاية القسطرة' },
  physiotherapy_basics:        { en: 'Physiotherapy Basics',        ar: 'أساسيات العلاج الطبيعي' },
};

export const MAID_CLEANING_TYPES = ['regular', 'deep', 'move_in_out'] as const;
export type MaidCleaningType = (typeof MAID_CLEANING_TYPES)[number];

export const MAID_CLEANING_TYPE_LABELS: Record<MaidCleaningType, { en: string; ar: string }> = {
  regular:      { en: 'Regular Cleaning',            ar: 'تنظيف عادي' },
  deep:         { en: 'Deep Cleaning',               ar: 'تنظيف عميق' },
  move_in_out:  { en: 'Move-In / Move-Out Cleaning', ar: 'تنظيف انتقال' },
};

export const MAID_SERVICES = [
  'regular_cleaning',
  'deep_cleaning',
  'move_in_out_cleaning',
  'laundry',
  'ironing',
  'window_cleaning',
  'organizing',
] as const;

export type MaidService = (typeof MAID_SERVICES)[number];

export const MAID_SERVICE_LABELS: Record<MaidService, { en: string; ar: string }> = {
  regular_cleaning:    { en: 'Regular Cleaning',   ar: 'تنظيف عادي' },
  deep_cleaning:       { en: 'Deep Cleaning',      ar: 'تنظيف عميق' },
  move_in_out_cleaning:{ en: 'Move-In/Out Cleaning',ar: 'تنظيف انتقال' },
  laundry:             { en: 'Laundry',             ar: 'غسيل ملابس' },
  ironing:             { en: 'Ironing',             ar: 'كي ملابس' },
  window_cleaning:     { en: 'Window Cleaning',     ar: 'تنظيف نوافذ' },
  organizing:          { en: 'Organizing',          ar: 'ترتيب' },
};

export const BABYSITTER_SKILLS = [
  'infants',
  'toddlers',
  'preschool',
  'school_age',
  'first_aid_certified',
  'special_needs',
  'tutoring',
] as const;

export type BabysitterSkill = (typeof BABYSITTER_SKILLS)[number];

export const BABYSITTER_SKILL_LABELS: Record<BabysitterSkill, { en: string; ar: string }> = {
  infants:            { en: 'Infants (0–1 yr)',      ar: 'رضع' },
  toddlers:           { en: 'Toddlers (1–3 yrs)',    ar: 'أطفال صغار' },
  preschool:          { en: 'Preschool (3–5 yrs)',   ar: 'ما قبل المدرسة' },
  school_age:         { en: 'School Age (6–12 yrs)', ar: 'سن المدرسة' },
  first_aid_certified:{ en: 'First Aid Certified',   ar: 'شهادة إسعافات أولية' },
  special_needs:      { en: 'Special Needs',         ar: 'ذوو الاحتياجات الخاصة' },
  tutoring:           { en: 'Tutoring',              ar: 'تدريس خصوصي' },
};
