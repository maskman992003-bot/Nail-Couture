export type WalletMilestone = {
  points: number;
  reward_label: string;
  reward_value: number;
  unlocked: boolean;
  redeemed: boolean;
  redemption_code?: string | null;
  used_at?: string | null;
};

export type WalletFounding = {
  type: 'vanguard' | 'legacy';
  spot: number;
  badge: string;
} | null;

export type WalletSnapshot = {
  success: boolean;
  error?: string;
  points?: number;
  tier?: string;
  tier_earned?: string;
  tierName?: string;
  tierColor?: string;
  tierTagline?: string;
  tierBenefits?: string[];
  rolling_spend_12m?: number;
  /** @deprecated Use rolling_spend_12m */
  calendar_spend_ytd?: number;
  fm_floor_active?: boolean;
  fm_floor_until?: string | null;
  points_expiring_soon?: number;
  next_points_expiry?: string | null;
  next_tier?: string | null;
  nextTierName?: string | null;
  spend_to_next_tier?: number;
  founding?: WalletFounding;
  milestones?: WalletMilestone[];
  earn_rate?: number;
  cached_at?: string;
};

export type FoundingResult = {
  success: boolean;
  reason?: string;
  already_member?: boolean;
  spot?: number;
  type?: string;
  badge_label?: string;
};
