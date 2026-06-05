export const ACHIEVEMENTS = [
  {
    id: 'first_visit',
    label: 'First Visit',
    emoji: '✨',
    check: ({ stats }) => (stats?.totalVisits || 0) >= 1,
  },
  {
    id: 'ten_visits',
    label: '10 Visits',
    emoji: '💎',
    check: ({ stats }) => (stats?.totalVisits || 0) >= 10,
  },
  {
    id: 'referral_champion',
    label: 'Referral Champion',
    emoji: '🤝',
    check: ({ referralInfo }) => (referralInfo?.referralsCount || 0) >= 1,
  },
  {
    id: 'diamond_member',
    label: 'Diamond Member',
    emoji: '👑',
    check: ({ tier }) => tier?.name === 'Diamond',
  },
];

export function computeAchievements(context) {
  return ACHIEVEMENTS.map((badge) => ({
    ...badge,
    earned: badge.check(context),
  }));
}
