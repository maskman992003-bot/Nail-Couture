import { useEffect, useState } from 'react';

const LOW_PASS = 0.12;

export function useTiltSensor(enabled = true) {
  const [tilt, setTilt] = useState({ tiltX: 0, tiltY: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      setTilt({ tiltX: 0, tiltY: 0 });
      return undefined;
    }

    const handleOrientation = (e) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      setTilt((prev) => ({
        tiltX: prev.tiltX + (gamma / 45 - prev.tiltX) * LOW_PASS,
        tiltY: prev.tiltY + ((beta - 45) / 45 - prev.tiltY) * LOW_PASS,
      }));
    };

    const handleMouse = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setTilt((prev) => ({
        tiltX: prev.tiltX + (nx - prev.tiltX) * LOW_PASS,
        tiltY: prev.tiltY + (ny - prev.tiltY) * LOW_PASS,
      }));
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouse);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, [enabled, reduceMotion]);

  return tilt;
}
