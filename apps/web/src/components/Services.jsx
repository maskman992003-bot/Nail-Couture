import { useAuth } from '../contexts/AuthContext';
import ServicesAdmin from './ServicesAdmin';
import ServicesPublic from './ServicesPublic';
import Navbar from './Navbar';
import Footer from './Footer';
import PageHelmet from './PageHelmet';
import { SERVICES_PAGE_SEO } from '../constants/pageSeo';

export default function Services() {
  const { user } = useAuth();
  const isStaff = user?.is_staff || false;

  const helmet = (
    <PageHelmet
      title={SERVICES_PAGE_SEO.title}
      description={SERVICES_PAGE_SEO.description}
      path={SERVICES_PAGE_SEO.path}
    />
  );

  if (isStaff) {
    return (
      <>
        {helmet}
        <ServicesAdmin />
      </>
    );
  }

  return (
    <>
      {helmet}
      <div className="min-h-screen bg-primary text-primary flex flex-col">
        <Navbar currentPage="services" onNavigate={() => {}} />
        <main className="flex-1">
          <ServicesPublic />
        </main>
        <Footer onNavigate={() => {}} />
      </div>
    </>
  );
}
