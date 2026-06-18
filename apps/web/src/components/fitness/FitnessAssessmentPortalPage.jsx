import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from '../Sidebar';
import FitnessAssessmentDashboard from './FitnessAssessmentDashboard';

export default function FitnessAssessmentPortalPage() {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${
        theme === 'dark' ? 'bg-primary text-primary' : 'bg-white text-charcoal'
      }`}
    >
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-8">
        <div>
          <h1 className="font-heading text-4xl text-gold">Fitness Assessment</h1>
          <p
            className={
              theme === 'dark' ? 'text-offwhite/50 text-sm mt-1' : 'text-charcoal/50 text-sm mt-1'
            }
          >
            Track your body composition and daily calorie targets
          </p>
        </div>

        <FitnessAssessmentDashboard />
      </div>
    </div>
  );
}
