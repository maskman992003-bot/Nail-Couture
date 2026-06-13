import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes.js';
import Sidebar from '../Sidebar';
import NailAssessmentDashboard from './NailAssessmentDashboard';

export default function NailAssessmentPortalPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const homePath = getHomePath(user?.role);

  return (
    <div
      className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${
        theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'
      }`}
    >
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={homePath}
              className={
                theme === 'dark'
                  ? 'text-offwhite/40 hover:text-gold text-sm'
                  : 'text-charcoal/40 hover:text-gold text-sm'
              }
            >
              Home
            </Link>
            <span className={theme === 'dark' ? 'text-offwhite/30' : 'text-charcoal/30'}>/</span>
            <span className="text-gold font-heading text-sm">Nail Health Assessment</span>
          </div>
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
