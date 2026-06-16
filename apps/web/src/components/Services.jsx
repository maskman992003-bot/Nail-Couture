import { useAuth } from '../contexts/AuthContext';
import ServicesAdmin from './ServicesAdmin';
import ServicesPublic from './ServicesPublic';
import Navbar from './Navbar';
import Footer from './Footer';
import PageHelmet from './PageHelmet';
import { APP_PAGE_SEO } from '../constants/pageSeo';

export default function Services({ embedded = false }) {
  const { user } = useAuth();
  const isStaff = user?.is_staff || false;

  const helmet = (
    <PageHelmet
      title={APP_PAGE_SEO['/services'].title}
      description={APP_PAGE_SEO['/services'].description}
      path={APP_PAGE_SEO['/services'].path}
    />
  );

  if (isStaff) {
    return (
      <>
        {!embedded && helmet}
        <ServicesAdmin />
      </>
    );
  }

  if (embedded) {
    return <ServicesPublic />;
  }

  return (
    <>
      {helmet}
      <div className="min-h-screen bg-primary text-primary flex flex-col">
        <Navbar currentPage="services" onNavigate={() => {}} />
        <main className="flex-1">
          <ServicesPublic />
        </main>
        <Footer />
      </div>
    </>
  );
}
