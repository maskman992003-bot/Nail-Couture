import { useAuth } from '../contexts/AuthContext';
import ServicesAdmin from './ServicesAdmin';
import ServicesPublic from './ServicesPublic';
import PageHelmet from './PageHelmet';
import { SERVICES_PAGE_SEO } from '../constants/pageSeo';

export default function Services() {
  const { user } = useAuth();
  const isStaff = user?.is_staff || false;

  return (
    <>
      <PageHelmet
        title={SERVICES_PAGE_SEO.title}
        description={SERVICES_PAGE_SEO.description}
        path={SERVICES_PAGE_SEO.path}
      />
      {isStaff ? <ServicesAdmin /> : <ServicesPublic />}
    </>
  );
}