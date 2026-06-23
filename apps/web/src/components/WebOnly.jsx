import { useMobileBridge } from '../hooks/useMobileBridge';

/** Renders children only outside the native Capacitor shell (web browser). */
export default function WebOnly({ children }) {
  const { hideWebOnly } = useMobileBridge();
  if (hideWebOnly) return null;
  return children;
}
