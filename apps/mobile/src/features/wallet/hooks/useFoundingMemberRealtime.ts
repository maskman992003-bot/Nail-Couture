import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';

const REVEAL_SEEN_KEY = 'founding_reveal_seen_';

type FoundingRevealPayload = {
  founding_spot: number;
  founding_type: string;
  badge?: string;
};

export function useFoundingMemberRealtime(profileId: string | undefined) {
  const [revealPayload, setRevealPayload] = useState<FoundingRevealPayload | null>(null);
  const hadSpot = useRef(false);

  useEffect(() => {
    if (!profileId) return undefined;

    getSupabase()
      .from('profiles')
      .select('founding_spot, founding_type')
      .eq('id', profileId)
      .single()
      .then(({ data }: { data: { founding_spot?: number } | null }) => {
        if (data?.founding_spot) hadSpot.current = true;
      });

    const channel = getSupabase()
      .channel(`founding-${profileId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
        async (payload: { old: Record<string, unknown>; new: Record<string, unknown> }) => {
          const prev = payload.old as { founding_spot?: number };
          const next = payload.new as { founding_spot?: number; founding_type?: string };
          if (!prev.founding_spot && next.founding_spot) {
            const seenKey = `${REVEAL_SEEN_KEY}${profileId}_${next.founding_spot}`;
            const seen = await AsyncStorage.getItem(seenKey);
            if (!seen) {
              setRevealPayload({
                founding_spot: next.founding_spot,
                founding_type: next.founding_type || 'legacy',
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [profileId]);

  const dismissReveal = async () => {
    if (revealPayload && profileId) {
      await AsyncStorage.setItem(
        `${REVEAL_SEEN_KEY}${profileId}_${revealPayload.founding_spot}`,
        '1',
      );
    }
    setRevealPayload(null);
  };

  return { revealPayload, dismissReveal };
}
