import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { useTechnicianQueue } from '@nail-couture/shared/hooks/useTechnicianQueue';
import TechnicianDashboard from './technician/TechnicianDashboard';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';

export default function Technician() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role;

  const queue = useTechnicianQueue(user?.id, user?.phone);

  useRegisterPullToRefresh(() => queue.refetch?.(false));

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (userRole && userRole !== 'technician') {
      navigate(getHomePath(userRole));
    }
  }, [user, userRole, navigate]);

  if (queue.loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary pl-sidebar">
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-sidebar">
      <TechnicianDashboard user={user} {...queue} />
    </div>
  );
}
