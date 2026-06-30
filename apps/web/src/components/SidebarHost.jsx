import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { shouldShowAppSidebar } from '../utils/appSidebar';
import Sidebar from './Sidebar';

/** Single persistent sidebar — avoids remounting nav on every route change. */
export default function SidebarHost() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading || !shouldShowAppSidebar(pathname, user)) {
    return null;
  }

  return <Sidebar />;
}
