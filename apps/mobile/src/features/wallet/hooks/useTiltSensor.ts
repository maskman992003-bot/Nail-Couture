import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

type Tilt = { tiltX: number; tiltY: number };

const LOW_PASS = 0.15;

export function useTiltSensor(enabled = true): Tilt {
  const [tilt, setTilt] = useState<Tilt>({ tiltX: 0, tiltY: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      setTilt({ tiltX: 0, tiltY: 0 });
      return undefined;
    }

    DeviceMotion.setUpdateInterval(50);
    const sub = DeviceMotion.addListener((data) => {
      const beta = data.rotation?.beta ?? 0;
      const gamma = data.rotation?.gamma ?? 0;
      setTilt((prev) => ({
        tiltX: prev.tiltX + (gamma / 45 - prev.tiltX) * LOW_PASS,
        tiltY: prev.tiltY + (beta / 45 - prev.tiltY) * LOW_PASS,
      }));
    });

    return () => sub.remove();
  }, [enabled, reduceMotion]);

  return tilt;
}
