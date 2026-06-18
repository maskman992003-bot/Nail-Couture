import { FITNESS_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import { FitnessAssessmentContent } from '../../components/fitness/FitnessAssessmentContent';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';

export function CustomerFitnessAssessmentScreen() {
  if (!FITNESS_ASSESSMENT) return null;

  return (
    <CustomerScreenLayout
      title="Fitness Assessment"
      subtitle="Track your body composition and daily calorie targets"
    >
      <FitnessAssessmentContent />
    </CustomerScreenLayout>
  );
}
