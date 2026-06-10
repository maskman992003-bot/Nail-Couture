import { createClient } from 'npm:@supabase/supabase-js@2';

type QueueRecord = {
  id: string;
  announcement_id: string;
};

type BatchResult = {
  done: boolean;
  processed: number;
  total: number;
  status?: string;
  error?: string;
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
    const announcementId = queueRecord?.announcement_id;

    if (!queueId || !announcementId) {
      return json({ error: 'Missing queue id or announcement_id' }, 400);
    }

    await supabase
      .from('announcement_fanout_queue')
      .update({ status: 'processing' })
      .eq('id', queueId);

    let done = false;
    let iterations = 0;
    const maxIterations = 200;
    let lastResult: BatchResult | null = null;

    while (!done && iterations < maxIterations) {
      const { data, error } = await supabase.rpc('process_announcement_fanout_batch', {
        p_announcement_id: announcementId,
        p_batch_size: 500,
      });

      if (error) {
        await markFailed(supabase, queueId, error.message);
        return json({ success: false, error: error.message }, 500);
      }

      lastResult = (data as BatchResult) ?? null;
      done = Boolean(lastResult?.done);
      iterations += 1;

      if (!lastResult?.processed && !done) {
        break;
      }
    }

    if (!done) {
      const message = lastResult?.error ?? 'Fan-out did not complete within iteration limit';
      await markFailed(supabase, queueId, message);
      return json({ success: false, error: message, lastResult }, 500);
    }

    await supabase
      .from('announcement_fanout_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', queueId);

    return json({ success: true, iterations, result: lastResult });
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
    .from('announcement_fanout_queue')
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
