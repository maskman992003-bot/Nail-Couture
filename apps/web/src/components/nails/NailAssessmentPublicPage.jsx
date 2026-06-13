import Navbar from '../Navbar';
import Footer from '../Footer';
import PageHelmet from '../PageHelmet';
import { NAIL_ASSESSMENT_PAGE_SEO } from '../../constants/pageSeo';
import NailAssessmentDashboard from './NailAssessmentDashboard';

export default function NailAssessmentPublicPage() {
  return (
    <>
      <PageHelmet
        title={NAIL_ASSESSMENT_PAGE_SEO.title}
        description={NAIL_ASSESSMENT_PAGE_SEO.description}
        path={NAIL_ASSESSMENT_PAGE_SEO.path}
      />
      <div className="min-h-screen bg-primary text-primary">
        <Navbar currentPage="nails" onNavigate={() => {}} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-24">
          <header className="mb-10 text-center md:text-left">
            <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-3">Nail Care Tools</p>
            <h1 className="font-heading text-3xl md:text-4xl text-gold mb-2">Nail Health Assessment</h1>
            <p className="text-secondary text-sm max-w-2xl">
              Enter your nail structure, surface symptoms, and lifestyle to instantly receive chemistry
              recommendations, prep protocols, and maintenance timelines. No submit button needed — your
              dashboard updates in real time.
            </p>
          </header>
          <NailAssessmentDashboard />
        </main>
        <Footer onNavigate={() => {}} />
      </div>
    </>
  );
}
