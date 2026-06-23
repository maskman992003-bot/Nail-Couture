import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageHelmet from './PageHelmet';
import { DEFAULT_PAGE_SEO, resolveRouteSeo } from '../constants/pageSeo';
import { useMobileBridge } from '../hooks/useMobileBridge';

export default function RouteDocumentTitle() {
  const { hideWebOnly } = useMobileBridge();
  const { pathname } = useLocation();
  const pageSeo = pathname === '/' ? DEFAULT_PAGE_SEO : resolveRouteSeo(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  if (hideWebOnly) {
    return null;
  }

  return (
    <PageHelmet
      title={pageSeo.title}
      description={pageSeo.description}
      path={pageSeo.path || pathname}
    />
  );
}
