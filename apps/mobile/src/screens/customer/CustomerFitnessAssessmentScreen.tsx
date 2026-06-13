import { FitnessAssessmentContent } from '../../components/fitness/FitnessAssessmentContent';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';

export function CustomerFitnessAssessmentScreen() {
  return (
    <CustomerScreenLayout
      title="Fitness Assessment"
      subtitle="Track your body composition and daily calorie targets"
    >
      <FitnessAssessmentContent />
    </CustomerScreenLayout>
  );
}
