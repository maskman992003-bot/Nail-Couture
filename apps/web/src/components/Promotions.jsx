import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getAnnouncementsPromotionsPath(role) {
  if (role === 'owner') return '/owner/announcements?tab=home-offers';
  if (role === 'partner') return '/partner/announcements?tab=home-offers';
  return '/superadmin/announcements?tab=home-offers';
}

export default function Promotions() {
  const { user } = useAuth();
  return <Navigate to={getAnnouncementsPromotionsPath(user?.role)} replace />;
}
