import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type QueueRecord = {
  id: string;
  notification_id: string;
};

type NotificationRecord = {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  type: string | null;
  reference_id: string | null;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
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
    const queueRecord: QueueRecord | undefined =
      payload?.record ?? payload?.queue_record ?? payload;

    const queueId = queueRecord?.id;
    const notificationId = queueRecord?.notification_id;

    if (!queueId || !notificationId) {
      return json({ error: 'Missing queue id or notification_id' }, 400);
    }

    await supabase
      .from('notification_push_queue')
      .update({ status: 'processing', attempts: payload?.attempts ? payload.attempts + 1 : 1 })
      .eq('id', queueId);

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, recipient_id, title, body, type, reference_id')
      .eq('id', notificationId)
      .single<NotificationRecord>();

    if (notifError || !notification) {
      await markFailed(supabase, queueId, notifError?.message ?? 'Notification not found');
      return json({ error: 'Notification not found' }, 404);
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('device_push_tokens')
      .select('expo_push_token')
      .eq('profile_id', notification.recipient_id);

    if (tokenError) {
      await markFailed(supabase, queueId, tokenError.message);
      return json({ error: tokenError.message }, 500);
    }

    if (!tokens?.length) {
      await supabase
        .from('notification_push_queue')
        .update({ status: 'skipped', processed_at: new Date().toISOString(), last_error: 'No push tokens' })
        .eq('id', queueId);
      return json({ success: true, skipped: true, reason: 'no_tokens' });
    }

    const messages = tokens.map((row) => ({
      to: row.expo_push_token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: {
        notificationId: notification.id,
        type: notification.type,
        referenceId: notification.reference_id,
      },
    }));

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();
    const tickets: ExpoTicket[] = expoResult?.data ?? [];
    const errors = tickets.filter((t) => t.status === 'error');

    if (errors.length === tickets.length && tickets.length > 0) {
      const errMsg = errors.map((e) => e.message ?? e.details?.error).join('; ');
      await markFailed(supabase, queueId, errMsg);
      return json({ success: false, errors }, 502);
    }

    await supabase
      .from('notification_push_queue')
      .update({
        status: 'sent',
        processed_at: new Date().toISOString(),
        last_error: errors.length ? errors.map((e) => e.message).join('; ') : null,
      })
      .eq('id', queueId);

    return json({ success: true, sent: messages.length, tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  queueId: string,
  error: string,
) {
  await supabase
    .from('notification_push_queue')
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
