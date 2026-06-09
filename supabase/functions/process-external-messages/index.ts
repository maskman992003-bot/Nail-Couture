import { createClient } from 'npm:@supabase/supabase-js@2';

type QueueRecord = {
  id: string;
  notification_id: string | null;
  recipient_id: string;
  channel: 'sms' | 'email';
  destination: string;
  subject: string | null;
  body: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const payload = await req.json();
    const record: QueueRecord | undefined = payload?.record ?? payload;

    if (!record?.id || !record.destination || !record.body) {
      return json({ error: 'Missing queue record fields' }, 400);
    }

    if (Deno.env.get('EXTERNAL_MESSAGING_ENABLED') === 'false') {
      await supabase
        .from('external_message_queue')
        .update({ status: 'skipped', processed_at: new Date().toISOString(), last_error: 'Disabled' })
        .eq('id', record.id);
      return json({ success: true, skipped: true, reason: 'external_messaging_disabled' });
    }

    await supabase
      .from('external_message_queue')
      .update({ status: 'processing' })
      .eq('id', record.id);

    if (record.channel === 'sms') {
      const result = await sendSms(record.destination, record.body);
      if (!result.ok) {
        await markFailed(supabase, record.id, result.error ?? 'SMS failed');
        return json({ success: false, error: result.error }, 502);
      }
    } else {
      const result = await sendEmail(
        record.destination,
        record.subject ?? 'Nail Couture',
        record.body,
      );
      if (!result.ok) {
        await markFailed(supabase, record.id, result.error ?? 'Email failed');
        return json({ success: false, error: result.error }, 502);
      }
    }

    await supabase
      .from('external_message_queue')
      .update({ status: 'sent', processed_at: new Date().toISOString() })
      .eq('id', record.id);

    return json({ success: true, channel: record.channel });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio not configured (TWILIO_* secrets missing)' };
  }

  const cleanTo = to.replace(/\D/g, '');
  const e164 = cleanTo.startsWith('1') && cleanTo.length === 11 ? `+${cleanTo}` : `+1${cleanTo}`;

  const params = new URLSearchParams({
    To: e164,
    From: fromNumber,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text };
  }

  return { ok: true };
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Nail Couture <notifications@nailcouture.com>';

  if (!resendKey) {
    return { ok: false, error: 'Resend not configured (RESEND_API_KEY secret missing)' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text };
  }

  return { ok: true };
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  queueId: string,
  error: string,
) {
  await supabase
    .from('external_message_queue')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      last_error: error,
    })
    .eq('id', queueId);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
