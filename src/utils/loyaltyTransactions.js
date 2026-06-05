import { supabase } from '../lib/supabase';

export const LOYALTY_REWARDS = [
  { id: 'nail-art', name: 'Free Basic Nail Art', points: 100 },
  { id: 'refreshment', name: 'Free Refreshment', points: 200 },
  { id: 'voucher', name: '$25 Voucher', points: 500 },
];

const TYPE_LABELS = {
  earn: 'Earned',
  redeem: 'Redeemed',
  referral_bonus: 'Referral bonus',
  signup_bonus: 'Signup bonus',
  birthday_bonus: 'Birthday bonus',
  adjustment: 'Adjustment',
};

export function formatTransactionType(type) {
  return TYPE_LABELS[type] || type;
}

export async function fetchLoyaltyHistory(profileId, limit = 20) {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('id, transaction_type, points, balance_after, description, redemption_code, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message?.includes('loyalty_transactions') || error.code === '42P01') {
      return { rows: [], available: false };
    }
    throw error;
  }

  return { rows: data || [], available: true };
}

export async function redeemLoyaltyReward(profileId, pointsCost, rewardName) {
  const { data, error } = await supabase.rpc('redeem_loyalty_reward', {
    p_profile_id: profileId,
    p_points_cost: pointsCost,
    p_reward_name: rewardName,
  });

  if (error) {
    if (error.message?.includes('redeem_loyalty_reward') || error.code === '42883') {
      return { success: false, error: 'Redemption service unavailable. Run sql/024_phase3_loyalty_engagement.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Redemption failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}
