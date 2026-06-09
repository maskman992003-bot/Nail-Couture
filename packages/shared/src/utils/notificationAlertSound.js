import { featureFlags } from '../constants/featureFlags.js';

/**
 * Short chime when a new in-app notification arrives (foreground).
 */
export function playNotificationAlertSound() {
  if (!featureFlags.global.notifications) return;
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('nc_alert_sound') === 'false') return;

  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 784;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* ignore unsupported environments */
  }
}
