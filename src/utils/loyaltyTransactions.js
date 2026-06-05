import { supabase } from '../lib/supabase';

export const LOYALTY_REWARDS = [
  { id: 'nail-art', name: 'Free Basic Nail Art', points: 100, discountAmount: 15, description: '$15 service credit applied at checkout' },
  { id: 'refreshment', name: 'Free Refreshment', points: 200, discountAmount: 0, description: 'Complimentary refreshment with your visit' },
  { id: 'voucher', name: '$25 Voucher', points: 500, discountAmount: 25, description: '$25 off your visit total at checkout' },
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

export function getRewardById(rewardId) {
  return LOYALTY_REWARDS.find((reward) => reward.id === rewardId) || null;
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

export async function reserveLoyaltyRewardForVisit(callerPhone, appointmentId, reward) {
  const { data, error } = await supabase.rpc('reserve_loyalty_reward_for_visit', {
    caller_phone: callerPhone,
    appointment_id: appointmentId,
    p_reward_id: reward.id,
    p_points_cost: reward.points,
    p_reward_name: reward.name,
    p_discount_amount: reward.discountAmount || 0,
  });

  if (error) {
    if (error.message?.includes('reserve_loyalty_reward_for_visit') || error.code === '42883') {
      return { success: false, error: 'Reward reservation unavailable. Run sql/032_visit_loyalty_and_receipts.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Reservation failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}
