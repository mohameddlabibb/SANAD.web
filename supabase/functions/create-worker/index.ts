import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use caller's token to get their user ID, then verify admin role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: callerErr } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerErr || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      email, password, fullName, phone, city, nationalId,
      nationality, serviceType, dob,
      yearsExperience, hourlyRate, monthlyRate,
      carModel, chefType, specialTags,
      medicalSkills, overnightAvailable,
    } = body;

    if (!email || !password || !fullName || !serviceType || !nationalId || !dob) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, fullName, serviceType, nationalId, dob' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Pre-check: national ID uniqueness (avoids opaque trigger error)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('national_id', nationalId)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'National ID already exists' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create auth user — the on_auth_user_created trigger auto-creates
    //    a profiles row with role='user', full_name, national_id from metadata.
    const { data: newUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, national_id: nationalId },
    });

    if (createErr || !newUserData?.user) {
      const msg = createErr?.message ?? '';
      let friendlyError = msg;
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('email_exists') || msg.toLowerCase().includes('already been registered')) {
        friendlyError = 'Email already exists';
      } else if (msg.toLowerCase().includes('national_id') || msg.toLowerCase().includes('profiles_national_id_key')) {
        friendlyError = 'National ID already exists';
      } else if (msg.toLowerCase().includes('database error')) {
        friendlyError = 'Failed to create worker account. Please check all fields and try again.';
      }
      return new Response(JSON.stringify({ error: friendlyError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = newUserData.user.id;

    // 2. Upsert the profile — don't rely on the trigger timing.
    //    Service role bypasses RLS; onConflict='id' is a no-op key for upsert.
    const { error: upsertProfileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        national_id: nationalId,
        role: 'worker',
        phone_number: phone || null,
        city: city || null,
      }, { onConflict: 'id' });

    if (upsertProfileErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Failed to upsert profile: ' + upsertProfileErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build service-specific worker extras
    const workerExtras: Record<string, unknown> = {};
    if (serviceType === 'driver') {
      workerExtras.car_model = carModel || null;
    }
    if (serviceType === 'chef') {
      workerExtras.special_tags = Array.isArray(specialTags) && specialTags.length ? specialTags : null;
      workerExtras.special_attributes = chefType ? { chef_type: chefType } : null;
    }
    if (serviceType === 'caregiver') {
      const medSkills: string[] = Array.isArray(medicalSkills) ? [...medicalSkills] : [];
      if (!medSkills.includes('basic_nursing')) {
        medSkills.unshift('basic_nursing');
      }
      workerExtras.special_tags = medSkills;
      workerExtras.special_attributes = { overnight_available: overnightAvailable ?? false };
    }

    // 4. Insert into workers
    const { error: workerErr } = await supabaseAdmin
      .from('workers')
      .insert({
        id: userId,
        national_id: nationalId,
        dob,
        service_type: serviceType,
        years_experience: yearsExperience ?? 0,
        nationality: nationality || null,
        hourly_rate: hourlyRate ?? null,
        monthly_rate: monthlyRate ?? null,
        ...workerExtras,
      });

    if (workerErr) {
      // Rollback: deleting the auth user cascades to the profile
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Failed to create worker record: ' + workerErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
