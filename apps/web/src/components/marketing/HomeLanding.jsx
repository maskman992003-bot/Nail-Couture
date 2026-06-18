import { useAppTheme } from '../../hooks/useAppTheme.js';
import { isClassicLanding, isMarketingLanding } from '../../themes/themeUtils.js';
import ThemedHomeLanding from './ThemedHomeLanding.jsx';

export default function HomeLanding() {
  const { themeConfig } = useAppTheme();

  if (isClassicLanding(themeConfig)) {
    return null;
  }

  if (isMarketingLanding(themeConfig)) {
    return <ThemedHomeLanding />;
  }

  return <ThemedHomeLanding />;
}
