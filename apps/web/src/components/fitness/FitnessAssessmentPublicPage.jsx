import Navbar from '../Navbar';
import Footer from '../Footer';
import PageHelmet from '../PageHelmet';
import { APP_PAGE_SEO } from '../../constants/pageSeo';
import FitnessAssessmentDashboard from './FitnessAssessmentDashboard';

export default function FitnessAssessmentPublicPage() {
  return (
    <>
      <PageHelmet
        title={APP_PAGE_SEO['/fitness-assessment'].title}
        description={APP_PAGE_SEO['/fitness-assessment'].description}
        path={APP_PAGE_SEO['/fitness-assessment'].path}
      />
      <div className="min-h-screen bg-primary text-primary">
        <Navbar currentPage="fitness" onNavigate={() => {}} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-24">
          <header className="mb-10 text-center md:text-left">
            <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-3">Wellness Tools</p>
            <h1 className="font-heading text-3xl md:text-4xl text-gold mb-2">Fitness Assessment</h1>
            <p className="text-secondary text-sm max-w-2xl">
              Enter your measurements to instantly calculate BMI, BMR, TDEE, and body fat percentage.
              No submit button needed — your dashboard updates in real time.
            </p>
          </header>
          <FitnessAssessmentDashboard />
        </main>
        <Footer />
      </div>
    </>
  );
}
