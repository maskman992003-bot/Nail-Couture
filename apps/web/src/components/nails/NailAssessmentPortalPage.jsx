import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { NAIL_HEALTH_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import Sidebar from '../Sidebar';
import NailAssessmentDashboard from './NailAssessmentDashboard';

export default function NailAssessmentPortalPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  if (!NAIL_HEALTH_ASSESSMENT) {
    return <Navigate to={user ? getHomePath(user.role) : '/'} replace />;
  }

  return (
    <div
      className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${
        theme === 'dark' ? 'bg-primary text-primary' : 'bg-white text-charcoal'
      }`}
    >
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-8">
        <div>
          <h1 className="font-heading text-4xl text-gold">Nail Health Assessment</h1>
          <p
            className={
              theme === 'dark' ? 'text-offwhite/50 text-sm mt-1' : 'text-charcoal/50 text-sm mt-1'
            }
          >
            Personalized chemistry, prep protocols, and maintenance timelines
          </p>
        </div>

        <NailAssessmentDashboard />
      </div>
    </div>
  );
}
