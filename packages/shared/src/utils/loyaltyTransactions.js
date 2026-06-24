import { supabase } from '../lib/supabase';

export const LOYALTY_REWARDS = [
  { id: 'vault-100', name: 'Vault $5 Reward', points: 100, discountAmount: 5, description: 'Claim in The Vault first, or redeem here (deducts 100 pts)' },
  { id: 'vault-250', name: 'Vault $12 Reward', points: 250, discountAmount: 12, description: 'Claim in The Vault first, or redeem here (deducts 250 pts)' },
  { id: 'vault-500', name: 'Vault $25 Reward', points: 500, discountAmount: 25, description: 'Claim in The Vault first, or redeem here (deducts 500 pts)' },
  { id: 'vault-1000', name: 'Vault $60 Reward', points: 1000, discountAmount: 60, description: 'Claim in The Vault first, or redeem here (deducts 1000 pts)' },
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
  let query = supabase
    .from('loyalty_transactions')
    .select('id, transaction_type, points, balance_after, description, redemption_code, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

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

/** Validate a Vault redemption code at checkout (points already deducted when claimed in app). */
export async function validateVaultRedemptionCode(profileId, code) {
  const { data, error } = await supabase.rpc('validate_vault_redemption_code', {
    p_profile_id: profileId,
    p_code: String(code || '').trim().toUpperCase(),
  });

  if (error) {
    if (error.message?.includes('validate_vault_redemption_code') || error.code === '42883') {
      return { success: false, error: 'Vault validation unavailable. Run sql/101_vault_redemption_unify.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Validation failed' };
  }

  if (data?.error === 'invalid_or_used_code') {
    return { success: false, error: 'Invalid or already used vault code.' };
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
