import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const REVEAL_SEEN_KEY = 'founding_reveal_seen_';

export function useFoundingMemberRealtime(profileId) {
  const [revealPayload, setRevealPayload] = useState(null);

  useEffect(() => {
    if (!profileId) return undefined;

    supabase
      .from('profiles')
      .select('founding_spot, founding_type')
      .eq('id', profileId)
      .single();

    const channel = supabase
      .channel(`founding-web-${profileId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
        async (payload) => {
          const prev = payload.old || {};
          const next = payload.new || {};
          if (!prev.founding_spot && next.founding_spot) {
            const seenKey = `${REVEAL_SEEN_KEY}${profileId}_${next.founding_spot}`;
            if (localStorage.getItem(seenKey)) return;
            setRevealPayload({
              founding_spot: next.founding_spot,
              founding_type: next.founding_type || 'legacy',
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const dismissReveal = () => {
    if (revealPayload && profileId) {
      localStorage.setItem(
        `${REVEAL_SEEN_KEY}${profileId}_${revealPayload.founding_spot}`,
        '1',
      );
    }
    setRevealPayload(null);
  };

  return { revealPayload, dismissReveal };
}
