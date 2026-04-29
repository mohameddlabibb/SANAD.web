import { supabase } from '../lib/supabaseClient.js';

// Maps DB service_type values to frontend service keys
const serviceTypeMap = {
  chef: 'chefs',
  driver: 'drivers',
  babysitter: 'babysitters',
  maid: 'maid',
  caregiver: 'caregivers',
};

// Maps frontend service keys back to DB service_type values
const serviceTypeReverseMap = {
  chefs: 'chef',
  drivers: 'driver',
  babysitters: 'babysitter',
  maid: 'maid',
  caregivers: 'caregiver',
};

function mapWorkerToProvider(worker) {
  const profile = worker.profiles ?? {};
  const attrs = worker.special_attributes ?? {};

  return {
    id: worker.id,
    name: profile.full_name ?? '',
    nameAr: profile.full_name ?? '',
    service: serviceTypeMap[worker.service_type] ?? worker.service_type,
    rating: Number(worker.average_rating ?? 0),
    reviews: worker.total_reviews ?? 0,
    experience: worker.years_experience ?? 0,
    price: Number(worker.hourly_rate ?? 0),
    monthlyPrice: worker.monthly_rate != null ? Number(worker.monthly_rate) : null,
    image: profile.avatar_url ?? '',
    verified: Array.isArray(worker.special_tags) && worker.special_tags.includes('verified'),
    chefType: worker.service_type === 'chef' ? (attrs.chefType ?? attrs.chef_type ?? 'normal') : undefined,
    carModel: worker.car_model ?? null,
    attributes: Array.isArray(worker.special_tags) ? worker.special_tags.filter(t => t !== 'verified') : [],
    nationality: worker.nationality ?? '',
    languages: worker.languages ?? [],
    city: profile.city ?? '',
    overnightAvailable: attrs.overnight_available ?? false,
  };
}

export async function getWorkers(serviceType) {
  let query = supabase
    .from('workers')
    .select('*, monthly_rate, total_reviews, car_model, profiles(full_name, avatar_url, city)')
    .eq('documents_submitted', true);

  if (serviceType && serviceType !== 'all') {
    const dbType = serviceTypeReverseMap[serviceType];
    if (dbType) {
      query = query.eq('service_type', dbType);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapWorkerToProvider);
}

export async function getWorkerById(workerId) {
  const { data, error } = await supabase
    .from('workers')
    .select('*, total_reviews, car_model, profiles(full_name, avatar_url, city, phone_number)')
    .eq('id', workerId)
    .single();

  if (error) {
    throw error;
  }

  return mapWorkerToProvider(data);
}
