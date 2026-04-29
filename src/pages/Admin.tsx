import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Users, Briefcase, Calendar, CreditCard, Heart, RefreshCw } from 'lucide-react';
import {
  CAREGIVER_MEDICAL_SKILLS, CAREGIVER_MEDICAL_SKILL_LABELS,
  MAID_SERVICES, MAID_SERVICE_LABELS,
  BABYSITTER_SKILLS, BABYSITTER_SKILL_LABELS,
} from '@/types/workers';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAllUsers,
  getAllWorkers,
  getAllBookings,
  getWorkersByServiceType,
  getPendingTransactions,
  reassignWorker,
  updateWorkerPricing,
  approveTransaction,
  rejectTransaction,
  createWorker,
  updateWorker,
  deleteWorker,
  uploadWorkerDocument,
  saveWorkerDocumentRecord,
  getWorkerDocuments,
  getRefundQueue,
  markRefundProcessed,
  type AdminWorkerRow,
  type AdminBookingRow,
  type AdminTransactionRow,
  type RefundQueueRow,
} from '@/services/adminService';
import {
  getInstitutes,
  addInstitute,
  updateInstitute,
  deleteInstitute,
  uploadInstitutePhoto,
  type DonationInstitute,
} from '@/services/donationService';
import type { ProfileRow } from '@/types/profile';
import { Textarea } from '@/components/ui/textarea';
import { parseError } from '@/lib/parseError';

// ─── Status badge colours ─────────────────────────────────────────────────────
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  accepted: 'default',
  confirmed: 'default',
  ongoing: 'default',
  completed: 'outline',
  cancelled: 'destructive',
  approved: 'default',
  rejected: 'destructive',
};

const EMPTY_WORKER_FORM = {
  email: '', password: '', fullName: '', phone: '', city: '',
  nationalId: '', nationality: '', serviceType: '', dob: '', yearsExperience: '', hourlyRate: '', monthlyRate: '',
  // driver
  hasCar: '', carModel: '', carMake: '', carModelName: '', carYear: '',
  // chef
  chefType: '', specialTagsInput: [] as string[],
  // caregiver
  medicalSkillsInput: [] as string[],
  overnightAvailableInput: false,
  // maid
  maidServicesInput: [] as string[],
  maidBringsSupplies: false,
  // babysitter
  babysitterSkillsInput: [] as string[],
  babysitterOvernightAvailable: false,
  babysitterMaxChildren: '',
};

const CAR_DATA: Record<string, string[]> = {
  Toyota: ['Corolla', 'Camry', 'Yaris', 'Land Cruiser', 'Fortuner', 'Hilux', 'RAV4', 'Rush', 'Avanza', 'Prado'],
  Hyundai: ['Elantra', 'Tucson', 'i10', 'i20', 'Accent', 'Santa Fe', 'Sonata', 'Creta', 'i30', 'Verna'],
  Kia: ['Cerato', 'Sportage', 'Picanto', 'Rio', 'Sorento', 'Soul', 'Stonic', 'Carnival'],
  Chevrolet: ['Optra', 'Aveo', 'Cruze', 'Spark', 'Captiva', 'Traverse', 'Malibu', 'Equinox'],
  Nissan: ['Sunny', 'Sentra', 'Qashqai', 'X-Trail', 'Patrol', 'Kicks', 'Tiida', 'Juke', 'Pathfinder'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'City', 'Pilot'],
  Mitsubishi: ['Lancer', 'Eclipse Cross', 'Outlander', 'Pajero', 'L200', 'ASX'],
  Daihatsu: ['Sirion', 'Terios', 'Mira', 'Cuore', 'Charade', 'Gran Max'],
  Suzuki: ['Swift', 'Alto', 'Baleno', 'Jimny', 'Vitara', 'Ciaz', 'Ertiga'],
  Renault: ['Symbol', 'Logan', 'Duster', 'Megane', 'Clio', 'Kwid', 'Captur'],
  Peugeot: ['206', '207', '208', '301', '408', '2008', '3008', '5008'],
  Volkswagen: ['Polo', 'Golf', 'Passat', 'Tiguan', 'Jetta', 'T-Roc'],
  BMW: ['1 Series', '3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS'],
  Opel: ['Astra', 'Corsa', 'Mokka', 'Vectra', 'Zafira', 'Insignia'],
  Fiat: ['500', 'Punto', 'Bravo', 'Tipo', 'Doblo', 'Grande Punto'],
  Skoda: ['Fabia', 'Rapid', 'Octavia', 'Superb', 'Kodiaq', 'Karoq'],
  Jeep: ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler'],
  Ford: ['Fiesta', 'Focus', 'EcoSport', 'Escape', 'Explorer', 'Ranger'],
  Mazda: ['2', '3', '6', 'CX-3', 'CX-5', 'CX-9', 'BT-50'],
};

const CAR_YEARS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => String(2026 - i));

const parseCarModelString = (str: string) => {
  if (!str) return { carMake: '', carModelName: '', carYear: '' };
  const parts = str.trim().split(' ');
  let carYear = '';
  let rest = parts;
  if (parts.length > 0 && /^\d{4}$/.test(parts[parts.length - 1])) {
    carYear = parts[parts.length - 1];
    rest = parts.slice(0, -1);
  }
  const makeKey = Object.keys(CAR_DATA).find((m) => rest.join(' ').startsWith(m)) ?? rest[0] ?? '';
  const carModelName = makeKey ? rest.join(' ').slice(makeKey.length).trim() : rest.slice(1).join(' ');
  return { carMake: makeKey, carModelName, carYear };
};

const CUISINE_OPTIONS = [
  'Italian', 'Egyptian', 'Lebanese', 'Turkish', 'Indian', 'Chinese',
  'Japanese', 'Mexican', 'French', 'Greek', 'Thai', 'Mediterranean',
  'Moroccan', 'Gulf', 'American',
];

const SPECIALTY_OPTIONS = [
  'Gluten Free', 'Vegan', 'Vegetarian', 'Seafood', 'BBQ & Grills', 'Pastry & Desserts', 'Breakfast',
];

const INSTITUTE_TYPES: { value: string; label: string }[] = [
  { value: 'orphanage',            label: 'Orphanage' },
  { value: 'nursing_home',         label: 'Nursing Home' },
  { value: 'disability_care',      label: 'Disability Care Center' },
  { value: 'food_bank',            label: 'Food Bank' },
  { value: 'cancer_center',        label: 'Cancer Treatment Center' },
  { value: 'pediatric_care',       label: 'Pediatric Care' },
  { value: 'womens_shelter',       label: "Women's Shelter" },
  { value: 'educational',          label: 'Educational Foundation' },
  { value: 'rehabilitation',       label: 'Rehabilitation Center' },
  { value: 'community_development',label: 'Community Development Association' },
  { value: 'mosque_charity',       label: 'Mosque Charity' },
  { value: 'blood_bank',           label: 'Blood Bank' },
  { value: 'drug_rehabilitation',  label: 'Drug Rehabilitation Center' },
  { value: 'environmental',        label: 'Environmental Organization' },
  { value: 'animal_welfare',       label: 'Animal Welfare' },
];

// ─── Admin page ───────────────────────────────────────────────────────────────
const Admin = () => {
  const { toast } = useToast();

  // ── data state ───────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [workers, setWorkers] = useState<AdminWorkerRow[]>([]);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [pendingTxs, setPendingTxs] = useState<AdminTransactionRow[]>([]);
  const [refundQueue, setRefundQueue] = useState<RefundQueueRow[]>([]);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('users');

  // ── payment approval state ────────────────────────────────────────────────
  const [rejectTx, setRejectTx] = useState<AdminTransactionRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingTx, setProcessingTx] = useState(false);

  // ── reassign dialog ──────────────────────────────────────────────────────────
  const [reassignBooking, setReassignBooking] = useState<AdminBookingRow | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<AdminWorkerRow[]>([]);
  const [reassigning, setReassigning] = useState(false);

  // ── pricing dialog ───────────────────────────────────────────────────────────
  const [pricingWorker, setPricingWorker] = useState<AdminWorkerRow | null>(null);
  const [hourlyInput, setHourlyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  // ── add / edit worker dialog ─────────────────────────────────────────────────
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [addingWorker, setAddingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState(EMPTY_WORKER_FORM);
  const setWF = (field: string, value: string) =>
    setWorkerForm((prev) => ({ ...prev, [field]: value }));

  // ── edit worker dialog ───────────────────────────────────────────────────────
  const [editWorker, setEditWorker] = useState<AdminWorkerRow | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_WORKER_FORM);
  const setEF = (field: string, value: string) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));
  const [savingEdit, setSavingEdit] = useState(false);

  // ── delete worker ────────────────────────────────────────────────────────────
  const [deleteConfirmWorker, setDeleteConfirmWorker] = useState<AdminWorkerRow | null>(null);
  const [deletingWorker, setDeletingWorker] = useState(false);

  // ── document upload state ────────────────────────────────────────────────────
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [existingDocs, setExistingDocs] = useState<{ document_type: string; front_url: string | null; back_url: string | null }[]>([]);

  // ── worker filters ────────────────────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [workerFilters, setWorkerFilters] = useState({
    name: '', serviceType: '', city: '', minRating: '', minExperience: '',
    // driver-specific
    hasCar: '', filterCarMake: '', filterCarModelName: '', filterCarYear: '',
    // chef-specific
    filterChefType: '', filterCuisine: '', filterSpecialty: '',
    // caregiver-specific
    filterCaregiverSkill: '', filterCaregiverOvernight: '',
    // maid-specific
    filterMaidService: '', filterMaidSupplies: '',
    // babysitter-specific
    filterBabysitterSkill: '', filterBabysitterOvernight: '',
  });
  const setWFilter = (field: string, value: string) =>
    setWorkerFilters((prev) => ({ ...prev, [field]: value }));
  const EMPTY_WORKER_FILTERS = {
    name: '', serviceType: '', city: '', minRating: '', minExperience: '',
    hasCar: '', filterCarMake: '', filterCarModelName: '', filterCarYear: '',
    filterChefType: '', filterCuisine: '', filterSpecialty: '',
    filterCaregiverSkill: '', filterCaregiverOvernight: '',
    filterMaidService: '', filterMaidSupplies: '',
    filterBabysitterSkill: '', filterBabysitterOvernight: '',
  };
  const activeFilterCount = Object.values(workerFilters).filter(Boolean).length;

  // ── donation institutes ───────────────────────────────────────────────────────
  const [institutes, setInstitutes] = useState<DonationInstitute[]>([]);
  const EMPTY_INSTITUTE_FORM = { name: '', type: '' as 'orphanage' | 'nursing_home' | '', description: '', city: '', contact_info: '', photo_url: '' };
  const [instituteForm, setInstituteForm] = useState(EMPTY_INSTITUTE_FORM);
  const setIF = (field: string, value: string) => setInstituteForm(prev => ({ ...prev, [field]: value }));
  const [addInstituteOpen, setAddInstituteOpen] = useState(false);
  const [savingInstitute, setSavingInstitute] = useState(false);
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string>('');
  const [editInstitute, setEditInstitute] = useState<DonationInstitute | null>(null);
  const [editInstituteForm, setEditInstituteForm] = useState(EMPTY_INSTITUTE_FORM);
  const setEIF = (field: string, value: string) => setEditInstituteForm(prev => ({ ...prev, [field]: value }));
  const [savingEditInstitute, setSavingEditInstitute] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');
  const [deleteConfirmInstitute, setDeleteConfirmInstitute] = useState<DonationInstitute | null>(null);
  const [deletingInstitute, setDeletingInstitute] = useState(false);

  const handleAddInstitute = async () => {
    if (!instituteForm.name || !instituteForm.type) {
      toast({ title: 'Name and type are required', variant: 'destructive' });
      return;
    }
    setSavingInstitute(true);
    try {
      let photoUrl = instituteForm.photo_url;
      if (addPhotoFile) photoUrl = await uploadInstitutePhoto(addPhotoFile);
      await addInstitute({ ...instituteForm, photo_url: photoUrl, type: instituteForm.type });
      const updated = await getInstitutes();
      setInstitutes(updated);
      setAddInstituteOpen(false);
      setInstituteForm(EMPTY_INSTITUTE_FORM);
      setAddPhotoFile(null);
      setAddPhotoPreview('');
      toast({ title: 'Institute added' });
    } catch (err) {
      toast({ title: parseError(err), variant: 'destructive' });
    } finally {
      setSavingInstitute(false);
    }
  };

  const handleEditInstitute = async () => {
    if (!editInstitute) return;
    setSavingEditInstitute(true);
    try {
      let photoUrl = editInstituteForm.photo_url;
      if (editPhotoFile) photoUrl = await uploadInstitutePhoto(editPhotoFile);
      await updateInstitute(editInstitute.id, { ...editInstituteForm, photo_url: photoUrl });
      const updated = await getInstitutes();
      setInstitutes(updated);
      setEditInstitute(null);
      setEditPhotoFile(null);
      setEditPhotoPreview('');
      toast({ title: 'Institute updated' });
    } catch (err) {
      toast({ title: parseError(err), variant: 'destructive' });
    } finally {
      setSavingEditInstitute(false);
    }
  };

  const handleDeleteInstitute = async () => {
    if (!deleteConfirmInstitute) return;
    setDeletingInstitute(true);
    try {
      await deleteInstitute(deleteConfirmInstitute.id);
      setInstitutes(prev => prev.filter(i => i.id !== deleteConfirmInstitute.id));
      setDeleteConfirmInstitute(null);
      toast({ title: 'Institute deleted' });
    } catch (err) {
      toast({ title: parseError(err), variant: 'destructive' });
    } finally {
      setDeletingInstitute(false);
    }
  };

  // ── load all data ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, w, b, p, rq, inst] = await Promise.all([
        getAllUsers(),
        getAllWorkers(),
        getAllBookings(),
        getPendingTransactions(),
        getRefundQueue(),
        getInstitutes(),
      ]);
      setUsers(u);
      setWorkers(w);
      setBookings(b);
      setPendingTxs(p);
      setRefundQueue(rq);
      setInstitutes(inst);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── open reassign dialog ──────────────────────────────────────────────────────
  const openReassign = async (booking: AdminBookingRow) => {
    setReassignBooking(booking);
    const serviceType = booking.worker?.service_type ?? '';
    const w = await getWorkersByServiceType(serviceType);
    setAvailableWorkers(w.filter((wk) => wk.id !== booking.worker_id));
  };

  // ── confirm reassign ──────────────────────────────────────────────────────────
  const handleReassign = async (newWorkerId: string) => {
    if (!reassignBooking) return;
    setReassigning(true);
    try {
      await reassignWorker(reassignBooking.id, newWorkerId);
      await loadAll();
      toast({ title: 'Worker reassigned successfully' });
      setReassignBooking(null);
    } catch (err) {
      toast({ title: 'Reassign failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setReassigning(false);
    }
  };

  // ── open pricing dialog ───────────────────────────────────────────────────────
  const openPricing = (w: AdminWorkerRow) => {
    setPricingWorker(w);
    setHourlyInput(w.hourly_rate != null ? String(w.hourly_rate) : '');
    setMonthlyInput(w.monthly_rate != null ? String(w.monthly_rate) : '');
  };

  // ── save pricing ──────────────────────────────────────────────────────────────
  const handleSavePricing = async () => {
    if (!pricingWorker) return;
    setSavingPricing(true);
    try {
      const hourly = hourlyInput !== '' ? Number(hourlyInput) : null;
      const monthly = monthlyInput !== '' ? Number(monthlyInput) : null;
      await updateWorkerPricing(pricingWorker.id, hourly, monthly);
      await loadAll();
      toast({ title: 'Pricing updated successfully' });
      setPricingWorker(null);
    } catch (err) {
      toast({ title: 'Update failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setSavingPricing(false);
    }
  };

  // ── add worker ───────────────────────────────────────────────────────────────
  const handleAddWorker = async () => {
    if (!workerForm.email || !workerForm.password || !workerForm.fullName || !workerForm.serviceType || !workerForm.nationalId || !workerForm.dob) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setAddingWorker(true);
    try {
      const newWorkerId = await createWorker({
        email: workerForm.email,
        password: workerForm.password,
        fullName: workerForm.fullName,
        phone: workerForm.phone,
        city: workerForm.city,
        nationalId: workerForm.nationalId,
        nationality: workerForm.nationality,
        serviceType: workerForm.serviceType,
        dob: workerForm.dob,
        yearsExperience: workerForm.yearsExperience !== '' ? Number(workerForm.yearsExperience) : null,
        hourlyRate: workerForm.hourlyRate !== '' ? Number(workerForm.hourlyRate) : null,
        monthlyRate: workerForm.monthlyRate !== '' ? Number(workerForm.monthlyRate) : null,
        carModel: [workerForm.carMake, workerForm.carModelName, workerForm.carYear].filter(Boolean).join(' ') || workerForm.carModel,
        chefType: workerForm.chefType,
        specialTags: workerForm.specialTagsInput,
        medicalSkills: workerForm.medicalSkillsInput,
        overnightAvailable: workerForm.overnightAvailableInput,
        maidServicesInput: workerForm.maidServicesInput,
        maidBringsSupplies: workerForm.maidBringsSupplies,
        babysitterSkillsInput: workerForm.babysitterSkillsInput,
        babysitterOvernightAvailable: workerForm.babysitterOvernightAvailable,
        babysitterMaxChildren: workerForm.babysitterMaxChildren,
      });

      // Optimistically add the new worker to state — avoids a full loadAll() which blanks the page
      const carModelStr = [workerForm.carMake, workerForm.carModelName, workerForm.carYear].filter(Boolean).join(' ') || workerForm.carModel || null;
      const newWorkerRow: AdminWorkerRow = {
        id: newWorkerId,
        service_type: workerForm.serviceType,
        average_rating: null,
        years_experience: workerForm.yearsExperience !== '' ? Number(workerForm.yearsExperience) : null,
        hourly_rate: workerForm.hourlyRate !== '' ? Number(workerForm.hourlyRate) : null,
        monthly_rate: workerForm.monthlyRate !== '' ? Number(workerForm.monthlyRate) : null,
        total_jobs: 0,
        nationality: workerForm.nationality || null,
        car_model: workerForm.serviceType === 'driver' ? carModelStr : null,
        special_tags: workerForm.serviceType === 'chef'
          ? (workerForm.specialTagsInput.length ? workerForm.specialTagsInput : null)
          : workerForm.serviceType === 'caregiver'
            ? (workerForm.medicalSkillsInput.includes('basic_nursing') ? workerForm.medicalSkillsInput : ['basic_nursing', ...workerForm.medicalSkillsInput])
            : workerForm.serviceType === 'maid'
              ? (workerForm.maidServicesInput.length ? workerForm.maidServicesInput : null)
              : workerForm.serviceType === 'babysitter'
                ? (workerForm.babysitterSkillsInput.length ? workerForm.babysitterSkillsInput : null)
                : null,
        special_attributes: workerForm.serviceType === 'chef' && workerForm.chefType
          ? { chef_type: workerForm.chefType }
          : workerForm.serviceType === 'caregiver'
            ? { overnight_available: workerForm.overnightAvailableInput }
            : workerForm.serviceType === 'maid'
              ? { brings_supplies: workerForm.maidBringsSupplies }
              : workerForm.serviceType === 'babysitter'
                ? { overnight_available: workerForm.babysitterOvernightAvailable, ...(workerForm.babysitterMaxChildren !== '' ? { max_children: Number(workerForm.babysitterMaxChildren) } : {}) }
                : null,
        profiles: {
          full_name: workerForm.fullName,
          avatar_url: null,
          city: workerForm.city || null,
          phone_number: workerForm.phone || null,
          national_id: workerForm.nationalId,
        },
      };
      setWorkers((prev) => [newWorkerRow, ...prev]);

      // Upload documents if any files were selected
      try {
        if (idFrontFile) {
          const frontUrl = await uploadWorkerDocument(newWorkerId, 'national_id', idFrontFile, 'front');
          const backUrl = idBackFile
            ? await uploadWorkerDocument(newWorkerId, 'national_id', idBackFile, 'back')
            : undefined;
          await saveWorkerDocumentRecord({ worker_id: newWorkerId, document_type: 'national_id', front_url: frontUrl, back_url: backUrl });
        }
        if (workerForm.serviceType === 'driver' && licenseFrontFile) {
          const frontUrl = await uploadWorkerDocument(newWorkerId, 'driving_license', licenseFrontFile, 'front');
          const backUrl = licenseBackFile
            ? await uploadWorkerDocument(newWorkerId, 'driving_license', licenseBackFile, 'back')
            : undefined;
          await saveWorkerDocumentRecord({ worker_id: newWorkerId, document_type: 'driving_license', front_url: frontUrl, back_url: backUrl });
        }
      } catch (docError) {
        console.error('Document upload error:', docError);
        toast({ title: 'Worker saved but document upload failed', description: parseError(docError), variant: 'destructive' });
      }

      toast({ title: 'Worker added successfully' });
      setAddWorkerOpen(false);
      setWorkerForm(EMPTY_WORKER_FORM);
      setIdFrontFile(null);
      setIdBackFile(null);
      setLicenseFrontFile(null);
      setLicenseBackFile(null);
    } catch (err) {
      toast({ title: 'Failed to add worker', description: parseError(err), variant: 'destructive' });
    } finally {
      setAddingWorker(false);
    }
  };

  // ── open edit dialog ──────────────────────────────────────────────────────────
  const openEdit = async (w: AdminWorkerRow) => {
    setEditWorker(w);
    setExistingDocs([]);
    try {
      const docs = await getWorkerDocuments(w.id);
      setExistingDocs(docs);
    } catch {
      // non-critical — just won't show existing previews
    }
    const caregiverSkills = w.service_type === 'caregiver'
      ? (w.special_tags ?? []).filter(t => CAREGIVER_MEDICAL_SKILLS.includes(t as (typeof CAREGIVER_MEDICAL_SKILLS)[number]))
      : [];
    const maidServices = w.service_type === 'maid'
      ? (w.special_tags ?? []).filter(t => MAID_SERVICES.includes(t as (typeof MAID_SERVICES)[number]))
      : [];
    const babysitterSkills = w.service_type === 'babysitter'
      ? (w.special_tags ?? []).filter(t => BABYSITTER_SKILLS.includes(t as (typeof BABYSITTER_SKILLS)[number]))
      : [];
    setEditForm({
      email: '', password: '',
      fullName: w.profiles?.full_name ?? '',
      phone: w.profiles?.phone_number ?? '',
      city: w.profiles?.city ?? '',
      nationalId: w.profiles?.national_id ?? '',
      nationality: w.nationality ?? '',
      serviceType: w.service_type,
      yearsExperience: w.years_experience != null ? String(w.years_experience) : '',
      hourlyRate: w.hourly_rate != null ? String(w.hourly_rate) : '',
      monthlyRate: w.monthly_rate != null ? String(w.monthly_rate) : '',
      hasCar: w.service_type === 'driver' ? (w.car_model ? 'yes' : 'no') : '',
      carModel: w.car_model ?? '',
      ...parseCarModelString(w.car_model ?? ''),
      chefType: w.special_attributes?.chef_type ?? '',
      specialTagsInput: w.special_tags ?? [],
      medicalSkillsInput: caregiverSkills,
      overnightAvailableInput: w.special_attributes?.overnight_available ?? false,
      maidServicesInput: maidServices,
      maidBringsSupplies: w.special_attributes?.brings_supplies ?? false,
      babysitterSkillsInput: babysitterSkills,
      babysitterOvernightAvailable: w.special_attributes?.overnight_available ?? false,
      babysitterMaxChildren: w.special_attributes?.max_children != null ? String(w.special_attributes.max_children) : '',
    });
  };

  // ── save edit ─────────────────────────────────────────────────────────────────
  const handleEditWorker = async () => {
    if (!editWorker || !editForm.fullName || !editForm.serviceType) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      await updateWorker(editWorker.id, editWorker.id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        city: editForm.city,
        nationalId: editForm.nationalId,
        nationality: editForm.nationality,
        serviceType: editForm.serviceType,
        yearsExperience: editForm.yearsExperience !== '' ? Number(editForm.yearsExperience) : null,
        hourlyRate: editForm.hourlyRate !== '' ? Number(editForm.hourlyRate) : null,
        monthlyRate: editForm.monthlyRate !== '' ? Number(editForm.monthlyRate) : null,
        carModel: [editForm.carMake, editForm.carModelName, editForm.carYear].filter(Boolean).join(' ') || editForm.carModel,
        chefType: editForm.chefType,
        specialTags: editForm.specialTagsInput,
        medicalSkills: editForm.medicalSkillsInput,
        overnightAvailable: editForm.overnightAvailableInput,
        maidServicesInput: editForm.maidServicesInput,
        maidBringsSupplies: editForm.maidBringsSupplies,
        babysitterSkillsInput: editForm.babysitterSkillsInput,
        babysitterOvernightAvailable: editForm.babysitterOvernightAvailable,
        babysitterMaxChildren: editForm.babysitterMaxChildren,
      });
      await loadAll();

      // Upload documents if any files were selected
      try {
        if (idFrontFile) {
          const frontUrl = await uploadWorkerDocument(editWorker.id, 'national_id', idFrontFile, 'front');
          const backUrl = idBackFile
            ? await uploadWorkerDocument(editWorker.id, 'national_id', idBackFile, 'back')
            : undefined;
          await saveWorkerDocumentRecord({ worker_id: editWorker.id, document_type: 'national_id', front_url: frontUrl, back_url: backUrl });
        }
        if (editForm.serviceType === 'driver' && licenseFrontFile) {
          const frontUrl = await uploadWorkerDocument(editWorker.id, 'driving_license', licenseFrontFile, 'front');
          const backUrl = licenseBackFile
            ? await uploadWorkerDocument(editWorker.id, 'driving_license', licenseBackFile, 'back')
            : undefined;
          await saveWorkerDocumentRecord({ worker_id: editWorker.id, document_type: 'driving_license', front_url: frontUrl, back_url: backUrl });
        }
      } catch (docError) {
        console.error('Document upload error:', docError);
        toast({ title: 'Worker saved but document upload failed', description: parseError(docError), variant: 'destructive' });
      }

      toast({ title: 'Worker updated successfully' });
      setEditWorker(null);
      setIdFrontFile(null);
      setIdBackFile(null);
      setLicenseFrontFile(null);
      setLicenseBackFile(null);
      setExistingDocs([]);
    } catch (err) {
      toast({ title: 'Update failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── delete worker ─────────────────────────────────────────────────────────────
  const handleDeleteWorker = async () => {
    if (!deleteConfirmWorker) return;
    setDeletingWorker(true);
    try {
      await deleteWorker(deleteConfirmWorker.id);
      await loadAll();
      toast({ title: 'Worker removed successfully' });
      setDeleteConfirmWorker(null);
    } catch (err) {
      toast({ title: 'Delete failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setDeletingWorker(false);
    }
  };

  // ── approve instapay payment ──────────────────────────────────────────────
  const handleApprove = async (tx: AdminTransactionRow) => {
    setProcessingTx(true);
    try {
      await approveTransaction(tx);
      await loadAll();
      toast({ title: 'Payment approved successfully' });
    } catch (err) {
      toast({ title: 'Approval failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setProcessingTx(false);
    }
  };

  // ── reject instapay payment ───────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTx) return;
    setProcessingTx(true);
    try {
      await rejectTransaction(rejectTx.id, rejectNotes, rejectTx.user_id, rejectTx.invoice?.booking_id);
      await loadAll();
      toast({ title: 'Payment rejected' });
      setRejectTx(null);
      setRejectNotes('');
    } catch (err) {
      toast({ title: 'Rejection failed', description: parseError(err), variant: 'destructive' });
    } finally {
      setProcessingTx(false);
    }
  };

  const workerCities = [...new Set(workers.map((w) => w.profiles?.city).filter(Boolean) as string[])].sort();

  const filteredWorkers = workers.filter((w) => {
    if (workerFilters.name && !w.profiles?.full_name?.toLowerCase().includes(workerFilters.name.toLowerCase())) return false;
    if (workerFilters.serviceType && w.service_type !== workerFilters.serviceType) return false;
    if (workerFilters.city && w.profiles?.city !== workerFilters.city) return false;
    if (workerFilters.minRating && Number(w.average_rating ?? 0) < Number(workerFilters.minRating)) return false;
    if (workerFilters.minExperience && (w.years_experience ?? 0) < Number(workerFilters.minExperience)) return false;
    // driver-specific
    if (workerFilters.hasCar === 'yes' && !w.car_model) return false;
    if (workerFilters.hasCar === 'no' && w.car_model) return false;
    if (workerFilters.filterCarMake && !w.car_model?.toLowerCase().startsWith(workerFilters.filterCarMake.toLowerCase())) return false;
    if (workerFilters.filterCarModelName && !w.car_model?.toLowerCase().includes(workerFilters.filterCarModelName.toLowerCase())) return false;
    if (workerFilters.filterCarYear && !w.car_model?.endsWith(workerFilters.filterCarYear)) return false;
    // chef-specific
    if (workerFilters.filterChefType && w.special_attributes?.chef_type !== workerFilters.filterChefType) return false;
    if (workerFilters.filterCuisine && !w.special_tags?.includes(workerFilters.filterCuisine)) return false;
    if (workerFilters.filterSpecialty && !w.special_tags?.includes(workerFilters.filterSpecialty)) return false;
    // caregiver-specific
    if (workerFilters.filterCaregiverSkill && !w.special_tags?.includes(workerFilters.filterCaregiverSkill)) return false;
    if (workerFilters.filterCaregiverOvernight === 'yes' && !w.special_attributes?.overnight_available) return false;
    if (workerFilters.filterCaregiverOvernight === 'no' && w.special_attributes?.overnight_available) return false;
    // maid-specific
    if (workerFilters.filterMaidService && !w.special_tags?.includes(workerFilters.filterMaidService)) return false;
    if (workerFilters.filterMaidSupplies === 'yes' && !w.special_attributes?.brings_supplies) return false;
    if (workerFilters.filterMaidSupplies === 'no' && w.special_attributes?.brings_supplies) return false;
    // babysitter-specific
    if (workerFilters.filterBabysitterSkill && !w.special_tags?.includes(workerFilters.filterBabysitterSkill)) return false;
    if (workerFilters.filterBabysitterOvernight === 'yes' && !w.special_attributes?.overnight_available) return false;
    if (workerFilters.filterBabysitterOvernight === 'no' && w.special_attributes?.overnight_available) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-heading font-bold mb-6">Admin Dashboard</h1>

          <div className="flex gap-6">
            {/* ── Left Sidebar ── */}
            <aside className="w-52 shrink-0 space-y-1">
              {[
                { id: 'users',     label: 'Users',     icon: Users,      count: users.length },
                { id: 'workers',   label: 'Workers',   icon: Briefcase,  count: workers.length },
                { id: 'bookings',  label: 'Bookings',  icon: Calendar,   count: bookings.length },
                { id: 'payments',  label: 'Payments',  icon: CreditCard, count: pendingTxs.length },
                { id: 'refunds',   label: 'Refunds',   icon: RefreshCw,  count: refundQueue.length },
                { id: 'donations', label: 'Donations', icon: Heart,      count: institutes.length },
              ].map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 min-w-0">

            {/* ── Users ── */}
            {activeSection === 'users' && (
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>National ID</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">No users found</TableCell>
                        </TableRow>
                      )}
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                          <TableCell>{u.email || '—'}</TableCell>
                          <TableCell>{u.phone_number || '—'}</TableCell>
                          <TableCell>{u.national_id || '—'}</TableCell>
                          <TableCell>{u.created_at?.slice(0, 10) || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── Workers ── */}
            {activeSection === 'workers' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>All Workers</CardTitle>
                  <div className="flex gap-2 items-center">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => setWorkerFilters(EMPTY_WORKER_FILTERS)}
                        className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFiltersOpen((o) => !o)}
                      className="relative"
                    >
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                    <Button size="sm" onClick={() => setAddWorkerOpen(true)}>Add Worker</Button>
                  </div>
                </CardHeader>

                {/* ── Filter panel ── */}
                {filtersOpen && (
                  <div className="px-6 pb-4 border-b">
                    {/* ── Base filters row ── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                        <Input
                          placeholder="Search name…"
                          value={workerFilters.name}
                          onChange={(e) => setWFilter('name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</label>
                        <Select
                          value={workerFilters.serviceType || undefined}
                          onValueChange={(v) => setWorkerFilters((prev) => ({
                            ...prev,
                            serviceType: v,
                            hasCar: '', filterCarMake: '', filterCarModelName: '', filterCarYear: '',
                            filterChefType: '', filterCuisine: '', filterSpecialty: '',
                            filterCaregiverSkill: '', filterCaregiverOvernight: '',
                            filterMaidService: '', filterMaidSupplies: '',
                            filterBabysitterSkill: '', filterBabysitterOvernight: '',
                          }))}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All services" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chef">Chef</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                            <SelectItem value="babysitter">Babysitter</SelectItem>
                            <SelectItem value="maid">Maid</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
                        <Select value={workerFilters.city || undefined} onValueChange={(v) => setWFilter('city', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All cities" /></SelectTrigger>
                          <SelectContent>
                            {workerCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min Rating</label>
                        <Select value={workerFilters.minRating || undefined} onValueChange={(v) => setWFilter('minRating', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1★ and above</SelectItem>
                            <SelectItem value="2">2★ and above</SelectItem>
                            <SelectItem value="3">3★ and above</SelectItem>
                            <SelectItem value="4">4★ and above</SelectItem>
                            <SelectItem value="4.5">4.5★ and above</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min Exp (yrs)</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g. 2"
                          value={workerFilters.minExperience}
                          onChange={(e) => setWFilter('minExperience', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* ── Service-specific filter rows ── */}
                    {workerFilters.serviceType === 'driver' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="space-y-1 min-w-[140px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Has Car</label>
                          <Select
                            value={workerFilters.hasCar || undefined}
                            onValueChange={(v) => setWorkerFilters((prev) => ({ ...prev, hasCar: v, filterCarMake: '', filterCarModelName: '', filterCarYear: '' }))}
                          >
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {workerFilters.hasCar === 'yes' && (
                          <>
                            <div className="space-y-1 min-w-[150px]">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Car Make</label>
                              <Select
                                value={workerFilters.filterCarMake || undefined}
                                onValueChange={(v) => setWorkerFilters((prev) => ({ ...prev, filterCarMake: v, filterCarModelName: '' }))}
                              >
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any make" /></SelectTrigger>
                                <SelectContent>
                                  {Object.keys(CAR_DATA).map((make) => (
                                    <SelectItem key={make} value={make}>{make}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 min-w-[150px]">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Car Model</label>
                              <Select
                                value={workerFilters.filterCarModelName || undefined}
                                onValueChange={(v) => setWFilter('filterCarModelName', v)}
                                disabled={!workerFilters.filterCarMake}
                              >
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any model" /></SelectTrigger>
                                <SelectContent>
                                  {(CAR_DATA[workerFilters.filterCarMake] ?? []).map((model) => (
                                    <SelectItem key={model} value={model}>{model}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 min-w-[120px]">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Year</label>
                              <Select
                                value={workerFilters.filterCarYear || undefined}
                                onValueChange={(v) => setWFilter('filterCarYear', v)}
                              >
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any year" /></SelectTrigger>
                                <SelectContent>
                                  {CAR_YEARS.map((year) => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {workerFilters.serviceType === 'chef' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="space-y-1 min-w-[150px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chef Type</label>
                          <Select value={workerFilters.filterChefType || undefined} onValueChange={(v) => setWFilter('filterChefType', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-[160px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cuisine</label>
                          <Select value={workerFilters.filterCuisine || undefined} onValueChange={(v) => setWFilter('filterCuisine', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any cuisine" /></SelectTrigger>
                            <SelectContent>
                              {CUISINE_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-[160px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Specialty</label>
                          <Select value={workerFilters.filterSpecialty || undefined} onValueChange={(v) => setWFilter('filterSpecialty', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any specialty" /></SelectTrigger>
                            <SelectContent>
                              {SPECIALTY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {workerFilters.serviceType === 'caregiver' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="space-y-1 min-w-[200px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Medical Skill</label>
                          <Select value={workerFilters.filterCaregiverSkill || undefined} onValueChange={(v) => setWFilter('filterCaregiverSkill', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any skill" /></SelectTrigger>
                            <SelectContent>
                              {CAREGIVER_MEDICAL_SKILLS.map((s) => (
                                <SelectItem key={s} value={s}>{CAREGIVER_MEDICAL_SKILL_LABELS[s].en}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-[160px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overnight</label>
                          <Select value={workerFilters.filterCaregiverOvernight || undefined} onValueChange={(v) => setWFilter('filterCaregiverOvernight', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Available</SelectItem>
                              <SelectItem value="no">Not Available</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {workerFilters.serviceType === 'maid' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="space-y-1 min-w-[200px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</label>
                          <Select value={workerFilters.filterMaidService || undefined} onValueChange={(v) => setWFilter('filterMaidService', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any service" /></SelectTrigger>
                            <SelectContent>
                              {MAID_SERVICES.map((s) => (
                                <SelectItem key={s} value={s}>{MAID_SERVICE_LABELS[s].en}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-[160px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brings Supplies</label>
                          <Select value={workerFilters.filterMaidSupplies || undefined} onValueChange={(v) => setWFilter('filterMaidSupplies', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {workerFilters.serviceType === 'babysitter' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="space-y-1 min-w-[200px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skill</label>
                          <Select value={workerFilters.filterBabysitterSkill || undefined} onValueChange={(v) => setWFilter('filterBabysitterSkill', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any skill" /></SelectTrigger>
                            <SelectContent>
                              {BABYSITTER_SKILLS.map((s) => (
                                <SelectItem key={s} value={s}>{BABYSITTER_SKILL_LABELS[s].en}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-[160px]">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overnight</label>
                          <Select value={workerFilters.filterBabysitterOvernight || undefined} onValueChange={(v) => setWFilter('filterBabysitterOvernight', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Available</SelectItem>
                              <SelectItem value="no">Not Available</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <CardContent className="overflow-x-auto">
                  {activeFilterCount > 0 && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Showing {filteredWorkers.length} of {workers.length} workers
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Experience</TableHead>
                        <TableHead>Hourly (EGP)</TableHead>
                        <TableHead>Monthly (EGP)</TableHead>
                        <TableHead>Jobs</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground">
                            {workers.length === 0 ? 'No workers found' : 'No workers match the current filters'}
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredWorkers.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">{w.profiles?.full_name || '—'}</TableCell>
                          <TableCell className="capitalize">{w.service_type}</TableCell>
                          <TableCell>{w.profiles?.city || '—'}</TableCell>
                          <TableCell>{Number(w.average_rating ?? 0).toFixed(1)}</TableCell>
                          <TableCell>{w.years_experience ?? '—'} yrs</TableCell>
                          <TableCell>{w.hourly_rate != null ? Number(w.hourly_rate).toFixed(0) : '—'}</TableCell>
                          <TableCell>{w.monthly_rate != null ? Number(w.monthly_rate).toFixed(0) : '—'}</TableCell>
                          <TableCell>{w.total_jobs ?? 0}</TableCell>
                          <TableCell className="max-w-[200px]">
                            {w.service_type === 'driver' && w.car_model && (
                              <span className="text-sm text-muted-foreground">{w.car_model}</span>
                            )}
                            {w.service_type === 'chef' && w.special_tags && w.special_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {w.special_tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground border">
                                    {tag}
                                  </span>
                                ))}
                                {w.special_tags.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground border">
                                    +{w.special_tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            {['caregiver', 'maid', 'babysitter'].includes(w.service_type) && (
                              <div className="flex flex-col gap-1">
                                {w.special_tags && w.special_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {w.special_tags.slice(0, 3).map((tag) => (
                                      <span key={tag} className="px-1.5 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground border">
                                        {tag.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                    {w.special_tags.length > 3 && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground border">
                                        +{w.special_tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {w.service_type === 'caregiver' && w.special_attributes?.overnight_available && (
                                  <span className="text-[11px] text-muted-foreground">Overnight</span>
                                )}
                                {w.service_type === 'maid' && w.special_attributes?.brings_supplies && (
                                  <span className="text-[11px] text-muted-foreground">Brings supplies</span>
                                )}
                                {w.service_type === 'babysitter' && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {[
                                      w.special_attributes?.overnight_available ? 'Overnight' : '',
                                      w.special_attributes?.max_children ? `Max ${w.special_attributes.max_children} children` : '',
                                    ].filter(Boolean).join(' · ') || ''}
                                  </span>
                                )}
                                {(!w.special_tags || w.special_tags.length === 0) &&
                                  !w.special_attributes?.overnight_available &&
                                  !w.special_attributes?.brings_supplies &&
                                  !w.special_attributes?.max_children && (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            )}
                            {((w.service_type === 'driver' && !w.car_model) ||
                              (w.service_type === 'chef' && (!w.special_tags || w.special_tags.length === 0)) ||
                              !['driver', 'chef', 'caregiver', 'maid', 'babysitter'].includes(w.service_type)) && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(w)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmWorker(w)}>
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── Bookings ── */}
            {activeSection === 'bookings' && (
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Worker</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">No bookings found</TableCell>
                        </TableRow>
                      )}
                      {bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.user?.full_name || '—'}</TableCell>
                          <TableCell>{b.worker?.profiles?.full_name || '—'}</TableCell>
                          <TableCell className="capitalize">{b.worker?.service_type || '—'}</TableCell>
                          <TableCell>{b.booking_date || '—'}</TableCell>
                          <TableCell>{b.total_price != null ? `${b.total_price} EGP` : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[b.status] ?? 'outline'}>
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(b.status === 'pending' || b.status === 'accepted' || b.status === 'confirmed') && (
                              <Button size="sm" variant="outline" onClick={() => openReassign(b)}>
                                Reassign Worker
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── Payments ── */}
            {activeSection === 'payments' && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending InstaPay Payments</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount (EGP)</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Screenshot</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTxs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">No pending payments</TableCell>
                        </TableRow>
                      )}
                      {pendingTxs.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">{tx.user?.full_name || '—'}</TableCell>
                          <TableCell>{tx.user?.email || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={tx.invoice?.payment_type === 'balance' ? 'default' : 'secondary'}>
                              {tx.invoice?.payment_type === 'balance' ? 'Balance' : 'Deposit'}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.invoice?.amount != null ? Number(tx.invoice.amount).toFixed(0) : '—'}</TableCell>
                          <TableCell>{tx.created_at?.slice(0, 10) || '—'}</TableCell>
                          <TableCell>
                            {tx.screenshot_url ? (
                              <a
                                href={tx.screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline text-sm"
                              >
                                View
                              </a>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(tx)}
                                disabled={processingTx}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => { setRejectTx(tx); setRejectNotes(''); }}
                                disabled={processingTx}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── Refunds ── */}
            {activeSection === 'refunds' && (
              <Card>
                <CardHeader>
                  <CardTitle>Deposit Refund Queue</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Total Booking (EGP)</TableHead>
                        <TableHead>Deposit (20%)</TableHead>
                        <TableHead>Booking Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundQueue.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">No pending refunds</TableCell>
                        </TableRow>
                      )}
                      {refundQueue.map((row) => {
                        const depositAmt = row.total_price != null ? Math.ceil(row.total_price * 0.2) : null;
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.user?.full_name || '—'}</TableCell>
                            <TableCell>{row.user?.email || '—'}</TableCell>
                            <TableCell>{row.total_price != null ? Number(row.total_price).toFixed(0) : '—'}</TableCell>
                            <TableCell className="font-semibold text-primary">
                              {depositAmt != null ? `${depositAmt} EGP` : '—'}
                            </TableCell>
                            <TableCell>{row.created_at?.slice(0, 10) || '—'}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                disabled={processingRefund}
                                onClick={async () => {
                                  setProcessingRefund(true);
                                  try {
                                    await markRefundProcessed(row.id);
                                    setRefundQueue((prev) => prev.filter((r) => r.id !== row.id));
                                    toast({ title: 'Refund marked as processed' });
                                  } catch (err) {
                                    toast({ title: parseError(err), variant: 'destructive' });
                                  } finally {
                                    setProcessingRefund(false);
                                  }
                                }}
                              >
                                Mark Refunded
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── Donations ── */}
            {activeSection === 'donations' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Donation Institutes</CardTitle>
                  <Button size="sm" onClick={() => { setInstituteForm(EMPTY_INSTITUTE_FORM); setAddPhotoFile(null); setAddPhotoPreview(''); setAddInstituteOpen(true); }}>
                    + Add Institute
                  </Button>
                </CardHeader>
                <CardContent>
                  {institutes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No institutes yet. Add one to get started.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Photo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Contact Info</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {institutes.map(inst => (
                          <TableRow key={inst.id}>
                            <TableCell>
                              {inst.photo_url ? (
                                <img src={inst.photo_url} alt={inst.name} className="h-10 w-14 object-cover rounded" />
                              ) : (
                                <div className="h-10 w-14 bg-muted rounded" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{inst.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {INSTITUTE_TYPES.find(t => t.value === inst.type)?.label ?? inst.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{inst.city || '—'}</TableCell>
                            <TableCell>{inst.contact_info || '—'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditInstituteForm({
                                      name: inst.name,
                                      type: inst.type,
                                      description: inst.description ?? '',
                                      city: inst.city ?? '',
                                      contact_info: inst.contact_info ?? '',
                                      photo_url: inst.photo_url ?? '',
                                    });
                                    setEditInstitute(inst);
                                    setEditPhotoFile(null);
                                    setEditPhotoPreview('');
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDeleteConfirmInstitute(inst)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            </div>
          </div>
        </div>
      </main>

      {/* ── Reassign Worker Dialog ── */}
      <Dialog open={!!reassignBooking} onOpenChange={(open) => !open && setReassignBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reassign Worker</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Select a replacement worker for this booking
            {reassignBooking?.worker?.service_type && (
              <> (<span className="capitalize font-medium">{reassignBooking.worker.service_type}</span>)</>
            )}:
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {availableWorkers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No other workers of this type available.</p>
            )}
            {availableWorkers.map((w) => (
              <button
                key={w.id}
                onClick={() => handleReassign(w.id)}
                disabled={reassigning}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <div>
                  <p className="font-medium">{w.profiles?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{w.profiles?.city || '—'} · {w.years_experience ?? 0} yrs exp</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{Number(w.hourly_rate ?? 0).toFixed(0)} EGP/hr</p>
                  <p className="text-xs text-muted-foreground">★ {Number(w.average_rating ?? 0).toFixed(1)}</p>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignBooking(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Payment Dialog ── */}
      <Dialog open={!!rejectTx} onOpenChange={(open) => !open && setRejectTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting payment from <span className="font-medium">{rejectTx?.user?.full_name || 'user'}</span>.
            Please provide a reason.
          </p>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="mt-2"
            rows={3}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRejectTx(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingTx || !rejectNotes.trim()}
            >
              {processingTx ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Worker Dialog ── */}
      <Dialog open={addWorkerOpen} onOpenChange={(open) => { if (!open) { setAddWorkerOpen(false); setWorkerForm(EMPTY_WORKER_FORM); setIdFrontFile(null); setIdBackFile(null); setLicenseFrontFile(null); setLicenseBackFile(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Dummy hidden fields to absorb browser autofill */}
            <input type="text" style={{ display: 'none' }} autoComplete="username" readOnly />
            <input type="password" style={{ display: 'none' }} autoComplete="new-password" readOnly />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input placeholder="e.g. Ahmed Ali" value={workerForm.fullName} onChange={(e) => setWF('fullName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Service Type *</label>
                <Select value={workerForm.serviceType} onValueChange={(v) => setWF('serviceType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="babysitter">Babysitter</SelectItem>
                    <SelectItem value="maid">Maid</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Email *</label>
                <Input type="email" placeholder="worker@email.com" value={workerForm.email} onChange={(e) => setWF('email', e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Password *</label>
                <Input type="password" placeholder="Min 6 characters" value={workerForm.password} onChange={(e) => setWF('password', e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input placeholder="e.g. 01012345678" value={workerForm.phone} onChange={(e) => setWF('phone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <Input placeholder="e.g. Cairo" value={workerForm.city} onChange={(e) => setWF('city', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">National ID *</label>
                <Input placeholder="e.g. 29901011234567" value={workerForm.nationalId} onChange={(e) => setWF('nationalId', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Date of Birth *</label>
                <Input type="date" value={workerForm.dob} onChange={(e) => setWF('dob', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nationality</label>
                <Input placeholder="e.g. Egyptian" value={workerForm.nationality} onChange={(e) => setWF('nationality', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Years of Experience</label>
                <Input type="number" min="0" placeholder="e.g. 3" value={workerForm.yearsExperience} onChange={(e) => setWF('yearsExperience', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Hourly Rate (EGP)</label>
                <Input type="number" min="0" placeholder="e.g. 100" value={workerForm.hourlyRate} onChange={(e) => setWF('hourlyRate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Monthly Rate (EGP)</label>
                <Input type="number" min="0" placeholder="e.g. 3000" value={workerForm.monthlyRate} onChange={(e) => setWF('monthlyRate', e.target.value)} />
              </div>
            </div>
            {/* ── Driver-specific ── */}
            {workerForm.serviceType === 'driver' && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Does the driver have a car?</label>
                  <Select value={workerForm.hasCar || undefined} onValueChange={(v) => { setWF('hasCar', v); if (v === 'no') { setWF('carModel', ''); setWF('carMake', ''); setWF('carModelName', ''); setWF('carYear', ''); } }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {workerForm.hasCar === 'yes' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Car Details</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={workerForm.carMake || undefined} onValueChange={(v) => { setWF('carMake', v); setWF('carModelName', ''); }}>
                        <SelectTrigger><SelectValue placeholder="Make" /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(CAR_DATA).map((make) => (
                            <SelectItem key={make} value={make}>{make}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={workerForm.carModelName || undefined} onValueChange={(v) => setWF('carModelName', v)} disabled={!workerForm.carMake}>
                        <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
                        <SelectContent>
                          {(CAR_DATA[workerForm.carMake] ?? []).map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={workerForm.carYear || undefined} onValueChange={(v) => setWF('carYear', v)}>
                        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                          {CAR_YEARS.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* ── Chef-specific ── */}
            {workerForm.serviceType === 'chef' && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Chef Type</label>
                  <Select value={workerForm.chefType} onValueChange={(v) => setWF('chefType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specialties</label>
                  <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cuisines</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CUISINE_OPTIONS.map((cuisine) => {
                        const selected = (workerForm.specialTagsInput as string[]).includes(cuisine);
                        return (
                          <button key={cuisine} type="button"
                            onClick={() => { const c = workerForm.specialTagsInput as string[]; setWF('specialTagsInput', selected ? c.filter(x => x !== cuisine) : [...c, cuisine]); }}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                          >{cuisine}</button>
                        );
                      })}
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIALTY_OPTIONS.map((spec) => {
                        const selected = (workerForm.specialTagsInput as string[]).includes(spec);
                        return (
                          <button key={spec} type="button"
                            onClick={() => { const c = workerForm.specialTagsInput as string[]; setWF('specialTagsInput', selected ? c.filter(x => x !== spec) : [...c, spec]); }}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                          >{spec}</button>
                        );
                      })}
                    </div>
                  </div>
                  {(workerForm.specialTagsInput as string[]).length > 0 && (
                    <p className="text-xs text-muted-foreground">{(workerForm.specialTagsInput as string[]).length} selected</p>
                  )}
                </div>
              </>
            )}
            {/* ── Caregiver-specific ── */}
            {workerForm.serviceType === 'caregiver' && (
              <>
                <div className="space-y-3">
                  <div>
                    <Label className="font-medium">Medical Skills &amp; Certifications</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Basic Nursing is required for all caregivers and always included.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CAREGIVER_MEDICAL_SKILLS.filter(skill => skill !== 'basic_nursing').map(skill => (
                      <div key={skill} className="flex items-center gap-2">
                        <Checkbox
                          id={`add-skill-${skill}`}
                          checked={(workerForm.medicalSkillsInput as string[]).includes(skill)}
                          onCheckedChange={(checked) => {
                            const current = workerForm.medicalSkillsInput as string[];
                            setWorkerForm(prev => ({
                              ...prev,
                              medicalSkillsInput: checked
                                ? [...current, skill]
                                : current.filter(s => s !== skill),
                            }));
                          }}
                        />
                        <Label htmlFor={`add-skill-${skill}`} className="text-sm font-normal cursor-pointer">
                          {CAREGIVER_MEDICAL_SKILL_LABELS[skill].en}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 opacity-60">
                    <Checkbox id="add-skill-basic_nursing" checked={true} disabled />
                    <Label htmlFor="add-skill-basic_nursing" className="text-sm font-normal">
                      Basic Nursing (required)
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workerForm.overnightAvailableInput as boolean}
                    onCheckedChange={(v) => setWorkerForm(prev => ({ ...prev, overnightAvailableInput: v }))}
                    id="add-overnight-available"
                  />
                  <Label htmlFor="add-overnight-available">Available for overnight stays</Label>
                </div>
              </>
            )}
            {/* ── Maid-specific ── */}
            {workerForm.serviceType === 'maid' && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium">Services Offered</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MAID_SERVICES.map(service => (
                      <div key={service} className="flex items-center gap-2">
                        <Checkbox
                          id={`add-maid-${service}`}
                          checked={(workerForm.maidServicesInput as string[]).includes(service)}
                          onCheckedChange={(checked) => {
                            const current = workerForm.maidServicesInput as string[];
                            setWorkerForm(prev => ({
                              ...prev,
                              maidServicesInput: checked ? [...current, service] : current.filter(s => s !== service),
                            }));
                          }}
                        />
                        <Label htmlFor={`add-maid-${service}`} className="text-sm font-normal cursor-pointer">
                          {MAID_SERVICE_LABELS[service].en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workerForm.maidBringsSupplies as boolean}
                    onCheckedChange={(v) => setWorkerForm(prev => ({ ...prev, maidBringsSupplies: v }))}
                    id="add-maid-supplies"
                  />
                  <Label htmlFor="add-maid-supplies">Brings own cleaning supplies</Label>
                </div>
              </>
            )}
            {/* ── Babysitter-specific ── */}
            {workerForm.serviceType === 'babysitter' && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium">Age Groups &amp; Skills</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BABYSITTER_SKILLS.map(skill => (
                      <div key={skill} className="flex items-center gap-2">
                        <Checkbox
                          id={`add-bs-${skill}`}
                          checked={(workerForm.babysitterSkillsInput as string[]).includes(skill)}
                          onCheckedChange={(checked) => {
                            const current = workerForm.babysitterSkillsInput as string[];
                            setWorkerForm(prev => ({
                              ...prev,
                              babysitterSkillsInput: checked ? [...current, skill] : current.filter(s => s !== skill),
                            }));
                          }}
                        />
                        <Label htmlFor={`add-bs-${skill}`} className="text-sm font-normal cursor-pointer">
                          {BABYSITTER_SKILL_LABELS[skill].en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workerForm.babysitterOvernightAvailable as boolean}
                    onCheckedChange={(v) => setWorkerForm(prev => ({ ...prev, babysitterOvernightAvailable: v }))}
                    id="add-bs-overnight"
                  />
                  <Label htmlFor="add-bs-overnight">Available for overnight stays</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Max Children at Once</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="e.g. 3"
                    value={workerForm.babysitterMaxChildren as string}
                    onChange={e => setWorkerForm(prev => ({ ...prev, babysitterMaxChildren: e.target.value }))}
                  />
                </div>
              </>
            )}
            {/* ── Documents ── */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Documents</h4>
              <div className="space-y-2">
                <Label className="text-sm font-medium">National ID Card</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Front</p>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      className="text-xs"
                      onChange={e => setIdFrontFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Back</p>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      className="text-xs"
                      onChange={e => setIdBackFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>
              {workerForm.serviceType === 'driver' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Driving License</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Front</p>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        className="text-xs"
                        onChange={e => setLicenseFrontFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Back</p>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        className="text-xs"
                        onChange={e => setLicenseBackFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setAddWorkerOpen(false); setWorkerForm(EMPTY_WORKER_FORM); setIdFrontFile(null); setIdBackFile(null); setLicenseFrontFile(null); setLicenseBackFile(null); }}>Cancel</Button>
            <Button onClick={handleAddWorker} disabled={addingWorker}>
              {addingWorker ? 'Creating...' : 'Create Worker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Worker Dialog ── */}
      <Dialog open={!!editWorker} onOpenChange={(open) => { if (!open) { setEditWorker(null); setIdFrontFile(null); setIdBackFile(null); setLicenseFrontFile(null); setLicenseBackFile(null); setExistingDocs([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Worker — {editWorker?.profiles?.full_name || 'Worker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input placeholder="e.g. Ahmed Ali" value={editForm.fullName} onChange={(e) => setEF('fullName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Service Type *</label>
                <Select value={editForm.serviceType} onValueChange={(v) => setEF('serviceType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="babysitter">Babysitter</SelectItem>
                    <SelectItem value="maid">Maid</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input placeholder="e.g. 01012345678" value={editForm.phone} onChange={(e) => setEF('phone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <Input placeholder="e.g. Cairo" value={editForm.city} onChange={(e) => setEF('city', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">National ID *</label>
              <Input placeholder="e.g. 29901011234567" value={editForm.nationalId} onChange={(e) => setEF('nationalId', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nationality</label>
                <Input placeholder="e.g. Egyptian" value={editForm.nationality} onChange={(e) => setEF('nationality', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Years of Experience</label>
                <Input type="number" min="0" placeholder="e.g. 3" value={editForm.yearsExperience} onChange={(e) => setEF('yearsExperience', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Hourly Rate (EGP)</label>
                <Input type="number" min="0" placeholder="e.g. 100" value={editForm.hourlyRate} onChange={(e) => setEF('hourlyRate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Monthly Rate (EGP)</label>
                <Input type="number" min="0" placeholder="e.g. 3000" value={editForm.monthlyRate} onChange={(e) => setEF('monthlyRate', e.target.value)} />
              </div>
            </div>
            {/* ── Driver-specific ── */}
            {editForm.serviceType === 'driver' && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Does the driver have a car?</label>
                  <Select value={editForm.hasCar || undefined} onValueChange={(v) => { setEF('hasCar', v); if (v === 'no') { setEF('carModel', ''); setEF('carMake', ''); setEF('carModelName', ''); setEF('carYear', ''); } }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.hasCar === 'yes' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Car Details</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={editForm.carMake || undefined} onValueChange={(v) => { setEF('carMake', v); setEF('carModelName', ''); }}>
                        <SelectTrigger><SelectValue placeholder="Make" /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(CAR_DATA).map((make) => (
                            <SelectItem key={make} value={make}>{make}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={editForm.carModelName || undefined} onValueChange={(v) => setEF('carModelName', v)} disabled={!editForm.carMake}>
                        <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
                        <SelectContent>
                          {(CAR_DATA[editForm.carMake] ?? []).map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={editForm.carYear || undefined} onValueChange={(v) => setEF('carYear', v)}>
                        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                          {CAR_YEARS.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* ── Chef-specific ── */}
            {editForm.serviceType === 'chef' && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Chef Type</label>
                  <Select value={editForm.chefType} onValueChange={(v) => setEF('chefType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specialties</label>
                  <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cuisines</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CUISINE_OPTIONS.map((cuisine) => {
                        const selected = (editForm.specialTagsInput as string[]).includes(cuisine);
                        return (
                          <button key={cuisine} type="button"
                            onClick={() => { const c = editForm.specialTagsInput as string[]; setEF('specialTagsInput', selected ? c.filter(x => x !== cuisine) : [...c, cuisine]); }}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                          >{cuisine}</button>
                        );
                      })}
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIALTY_OPTIONS.map((spec) => {
                        const selected = (editForm.specialTagsInput as string[]).includes(spec);
                        return (
                          <button key={spec} type="button"
                            onClick={() => { const c = editForm.specialTagsInput as string[]; setEF('specialTagsInput', selected ? c.filter(x => x !== spec) : [...c, spec]); }}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                          >{spec}</button>
                        );
                      })}
                    </div>
                  </div>
                  {(editForm.specialTagsInput as string[]).length > 0 && (
                    <p className="text-xs text-muted-foreground">{(editForm.specialTagsInput as string[]).length} selected</p>
                  )}
                </div>
              </>
            )}
            {/* ── Caregiver-specific ── */}
            {editForm.serviceType === 'caregiver' && (
              <>
                <div className="space-y-3">
                  <div>
                    <Label className="font-medium">Medical Skills &amp; Certifications</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Basic Nursing is required for all caregivers and always included.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CAREGIVER_MEDICAL_SKILLS.filter(skill => skill !== 'basic_nursing').map(skill => (
                      <div key={skill} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-skill-${skill}`}
                          checked={(editForm.medicalSkillsInput as string[]).includes(skill)}
                          onCheckedChange={(checked) => {
                            const current = editForm.medicalSkillsInput as string[];
                            setEditForm(prev => ({
                              ...prev,
                              medicalSkillsInput: checked
                                ? [...current, skill]
                                : current.filter(s => s !== skill),
                            }));
                          }}
                        />
                        <Label htmlFor={`edit-skill-${skill}`} className="text-sm font-normal cursor-pointer">
                          {CAREGIVER_MEDICAL_SKILL_LABELS[skill].en}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 opacity-60">
                    <Checkbox id="edit-skill-basic_nursing" checked={true} disabled />
                    <Label htmlFor="edit-skill-basic_nursing" className="text-sm font-normal">
                      Basic Nursing (required)
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.overnightAvailableInput as boolean}
                    onCheckedChange={(v) => setEditForm(prev => ({ ...prev, overnightAvailableInput: v }))}
                    id="edit-overnight-available"
                  />
                  <Label htmlFor="edit-overnight-available">Available for overnight stays</Label>
                </div>
              </>
            )}
            {/* ── Maid-specific ── */}
            {editForm.serviceType === 'maid' && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium">Services Offered</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MAID_SERVICES.map(service => (
                      <div key={service} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-maid-${service}`}
                          checked={(editForm.maidServicesInput as string[]).includes(service)}
                          onCheckedChange={(checked) => {
                            const current = editForm.maidServicesInput as string[];
                            setEditForm(prev => ({
                              ...prev,
                              maidServicesInput: checked ? [...current, service] : current.filter(s => s !== service),
                            }));
                          }}
                        />
                        <Label htmlFor={`edit-maid-${service}`} className="text-sm font-normal cursor-pointer">
                          {MAID_SERVICE_LABELS[service].en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.maidBringsSupplies as boolean}
                    onCheckedChange={(v) => setEditForm(prev => ({ ...prev, maidBringsSupplies: v }))}
                    id="edit-maid-supplies"
                  />
                  <Label htmlFor="edit-maid-supplies">Brings own cleaning supplies</Label>
                </div>
              </>
            )}
            {/* ── Babysitter-specific ── */}
            {editForm.serviceType === 'babysitter' && (
              <>
                <div className="space-y-3">
                  <Label className="font-medium">Age Groups &amp; Skills</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BABYSITTER_SKILLS.map(skill => (
                      <div key={skill} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-bs-${skill}`}
                          checked={(editForm.babysitterSkillsInput as string[]).includes(skill)}
                          onCheckedChange={(checked) => {
                            const current = editForm.babysitterSkillsInput as string[];
                            setEditForm(prev => ({
                              ...prev,
                              babysitterSkillsInput: checked ? [...current, skill] : current.filter(s => s !== skill),
                            }));
                          }}
                        />
                        <Label htmlFor={`edit-bs-${skill}`} className="text-sm font-normal cursor-pointer">
                          {BABYSITTER_SKILL_LABELS[skill].en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.babysitterOvernightAvailable as boolean}
                    onCheckedChange={(v) => setEditForm(prev => ({ ...prev, babysitterOvernightAvailable: v }))}
                    id="edit-bs-overnight"
                  />
                  <Label htmlFor="edit-bs-overnight">Available for overnight stays</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Max Children at Once</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="e.g. 3"
                    value={editForm.babysitterMaxChildren as string}
                    onChange={e => setEditForm(prev => ({ ...prev, babysitterMaxChildren: e.target.value }))}
                  />
                </div>
              </>
            )}
            {/* ── Documents ── */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Documents</h4>

              {(() => {
                const idDoc = existingDocs.find(d => d.document_type === 'national_id');
                const licDoc = existingDocs.find(d => d.document_type === 'driving_license');
                const fileName = (url: string | null) => url ? decodeURIComponent(url.split('/').pop() ?? '') : null;
                return (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">National ID Card</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Front</p>
                          <Input type="file" accept="image/*,application/pdf" className="text-xs"
                            onChange={e => setIdFrontFile(e.target.files?.[0] ?? null)} />
                          {!idFrontFile && idDoc?.front_url && (
                            <a href={idDoc.front_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline truncate block mt-1">
                              {fileName(idDoc.front_url)}
                            </a>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Back</p>
                          <Input type="file" accept="image/*,application/pdf" className="text-xs"
                            onChange={e => setIdBackFile(e.target.files?.[0] ?? null)} />
                          {!idBackFile && idDoc?.back_url && (
                            <a href={idDoc.back_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline truncate block mt-1">
                              {fileName(idDoc.back_url)}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {editForm.serviceType === 'driver' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Driving License</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Front</p>
                            <Input type="file" accept="image/*,application/pdf" className="text-xs"
                              onChange={e => setLicenseFrontFile(e.target.files?.[0] ?? null)} />
                            {!licenseFrontFile && licDoc?.front_url && (
                              <a href={licDoc.front_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline truncate block mt-1">
                                {fileName(licDoc.front_url)}
                              </a>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Back</p>
                            <Input type="file" accept="image/*,application/pdf" className="text-xs"
                              onChange={e => setLicenseBackFile(e.target.files?.[0] ?? null)} />
                            {!licenseBackFile && licDoc?.back_url && (
                              <a href={licDoc.back_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline truncate block mt-1">
                                {fileName(licDoc.back_url)}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setEditWorker(null); setIdFrontFile(null); setIdBackFile(null); setLicenseFrontFile(null); setLicenseBackFile(null); setExistingDocs([]); }}>Cancel</Button>
            <Button onClick={handleEditWorker} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirmWorker} onOpenChange={(open) => !open && setDeleteConfirmWorker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Worker</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-medium text-foreground">{deleteConfirmWorker?.profiles?.full_name || 'this worker'}</span>? Their account will remain but they will no longer appear as a worker.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmWorker(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteWorker} disabled={deletingWorker}>
              {deletingWorker ? 'Removing...' : 'Remove Worker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Institute Dialog ── */}
      <Dialog open={addInstituteOpen} onOpenChange={setAddInstituteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Institute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Institute Name *</label>
              <Input value={instituteForm.name} onChange={e => setIF('name', e.target.value)} placeholder="e.g. Al-Rahma Orphanage" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type *</label>
              <Select value={instituteForm.type} onValueChange={v => setIF('type', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INSTITUTE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">City</label>
              <Input value={instituteForm.city} onChange={e => setIF('city', e.target.value)} placeholder="e.g. Cairo" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Info</label>
              <Input value={instituteForm.contact_info} onChange={e => setIF('contact_info', e.target.value)} placeholder="Phone or email" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Photo</label>
              <div className="flex items-center gap-3">
                {addPhotoPreview && (
                  <img src={addPhotoPreview} alt="preview" className="h-14 w-20 object-cover rounded border" />
                )}
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors">
                  <span>Choose file</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAddPhotoFile(file);
                      setAddPhotoPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
                {addPhotoFile && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{addPhotoFile.name}</span>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={instituteForm.description} onChange={e => setIF('description', e.target.value)} rows={3} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInstituteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddInstitute} disabled={savingInstitute}>
              {savingInstitute ? 'Adding...' : 'Add Institute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Institute Dialog ── */}
      <Dialog open={!!editInstitute} onOpenChange={open => !open && setEditInstitute(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Institute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Institute Name *</label>
              <Input value={editInstituteForm.name} onChange={e => setEIF('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type *</label>
              <Select value={editInstituteForm.type} onValueChange={v => setEIF('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTITUTE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">City</label>
              <Input value={editInstituteForm.city} onChange={e => setEIF('city', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Info</label>
              <Input value={editInstituteForm.contact_info} onChange={e => setEIF('contact_info', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Photo</label>
              <div className="flex items-center gap-3">
                {(editPhotoPreview || editInstituteForm.photo_url) && (
                  <img
                    src={editPhotoPreview || editInstituteForm.photo_url}
                    alt="preview"
                    className="h-14 w-20 object-cover rounded border"
                  />
                )}
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors">
                  <span>Choose file</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setEditPhotoFile(file);
                      setEditPhotoPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
                {editPhotoFile && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{editPhotoFile.name}</span>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={editInstituteForm.description} onChange={e => setEIF('description', e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInstitute(null)}>Cancel</Button>
            <Button onClick={handleEditInstitute} disabled={savingEditInstitute}>
              {savingEditInstitute ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Institute Dialog ── */}
      <Dialog open={!!deleteConfirmInstitute} onOpenChange={open => !open && setDeleteConfirmInstitute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Institute</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirmInstitute?.name}</span>? This cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmInstitute(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteInstitute} disabled={deletingInstitute}>
              {deletingInstitute ? 'Deleting...' : 'Delete Institute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set Pricing Dialog ── */}
      <Dialog open={!!pricingWorker} onOpenChange={(open) => !open && setPricingWorker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Prices — {pricingWorker?.profiles?.full_name || 'Worker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Hourly Rate (EGP/hr)</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 50"
                value={hourlyInput}
                onChange={(e) => setHourlyInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Monthly Rate (EGP/month)</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 3000"
                value={monthlyInput}
                onChange={(e) => setMonthlyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to disable monthly booking for this worker.</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPricingWorker(null)}>Cancel</Button>
            <Button onClick={handleSavePricing} disabled={savingPricing}>
              {savingPricing ? 'Saving...' : 'Save Prices'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
