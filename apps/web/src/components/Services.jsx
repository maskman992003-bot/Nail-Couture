import { useAuth } from '../contexts/AuthContext';
import ServicesAdmin from './ServicesAdmin';
import ServicesPublic from './ServicesPublic';
import Navbar from './Navbar';
import Footer from './Footer';
import PageHelmet from './PageHelmet';
import { APP_PAGE_SEO } from '../constants/pageSeo';
import WebOnly from './WebOnly.jsx';

export default function Services({ embedded = false }) {
  const { user } = useAuth();
  const isStaff = user?.is_staff || false;

  const helmet = (
    <WebOnly>
      <PageHelmet
        title={APP_PAGE_SEO['/services'].title}
        description={APP_PAGE_SEO['/services'].description}
        path={APP_PAGE_SEO['/services'].path}
      />
    </WebOnly>
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
        <WebOnly>
          <Navbar currentPage="services" onNavigate={() => {}} />
        </WebOnly>
        <main className="flex-1">
          <ServicesPublic />
        </main>
        <WebOnly>
          <Footer />
        </WebOnly>
      </div>
    </>
  );
}
