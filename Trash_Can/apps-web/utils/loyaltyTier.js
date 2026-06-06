export const tierDetails = {
  Silver: { points: 0, next: 100, reward: 'Gold status (10% off + free refreshment)' },
  Gold: { points: 100, next: 500, reward: 'Platinum status (15% off + priority booking + free refreshment)' },
  Platinum: { points: 500, next: 1000, reward: 'Diamond status (20% off + VIP priority + free premium service)' },
  Diamond: { points: 1000, next: null, reward: 'Maximum tier — enjoy all premium perks!' },
};

export function getTierInfo(points) {
  const pts = points || 0;
  if (pts >= 1000) {
    return { name: 'Diamond', color: 'text-cyan-400', benefit: '20% off + VIP priority + free premium service', nextTier: null, nextThreshold: null, progress: 100 };
  }
  if (pts >= 500) {
    return { name: 'Platinum', color: 'text-gray-300', benefit: '15% off + priority booking + free refreshment', nextTier: 'Diamond', nextThreshold: 1000, progress: ((pts - 500) / 500) * 100 };
  }
  if (pts >= 100) {
    return { name: 'Gold', color: 'text-gold', benefit: '10% off + free refreshment', nextTier: 'Platinum', nextThreshold: 500, progress: ((pts - 100) / 400) * 100 };
  }
  return { name: 'Silver', color: 'text-gray-400', benefit: '5% off all services', nextTier: 'Gold', nextThreshold: 100, progress: (pts / 100) * 100 };
}

export function generateReferralCode(fullName) {
  const cleanName = (fullName || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
}

export function isBirthdayMonth(birthday) {
  if (!birthday) return false;
  const month = birthday.split('-')[0];
  const now = new Date();
  return month === String(now.getMonth() + 1).padStart(2, '0');
}
