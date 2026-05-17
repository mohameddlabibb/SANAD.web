import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'SANAD <noreply@sanad.com>';

    // Verify caller is admin
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

    const { workerEmail, workerName, reason } = await req.json();

    if (!workerEmail || !workerName || !reason) {
      return new Response(JSON.stringify({ error: 'Missing workerEmail, workerName, or reason' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #c2a04c; font-size: 28px; margin: 0;">SANAD</h1>
        </div>

        <h2 style="font-size: 20px; margin-bottom: 8px;">Account Application Update</h2>
        <p style="color: #555; margin-bottom: 24px;">Dear ${workerName},</p>

        <p style="color: #555; line-height: 1.6;">
          Thank you for applying to join the SANAD platform. After reviewing your account and uploaded documents,
          we were unable to approve your application at this time.
        </p>

        <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 16px 20px; border-radius: 4px; margin: 24px 0;">
          <p style="font-weight: 600; color: #c53030; margin: 0 0 8px 0;">Reason for rejection:</p>
          <p style="color: #555; margin: 0; line-height: 1.6; white-space: pre-wrap;">${reason}</p>
        </div>

        <p style="color: #555; line-height: 1.6;">
          Please address the issues mentioned above, update your profile and documents through the SANAD app,
          and resubmit for review. Our team will review your updated application as soon as possible.
        </p>

        <p style="color: #555; line-height: 1.6;">
          If you have any questions, please contact our support team.
        </p>

        <p style="color: #555; margin-top: 32px;">
          Best regards,<br/>
          <strong>The SANAD Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          This email was sent by SANAD. Please do not reply to this email.
        </p>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [workerEmail],
        subject: 'Your SANAD Account Application — Action Required',
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      return new Response(JSON.stringify({ error: 'Failed to send email: ' + errBody }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
