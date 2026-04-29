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
