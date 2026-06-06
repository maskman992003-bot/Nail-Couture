import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { useTechnicianQueue } from '@nail-couture/shared/hooks/useTechnicianQueue';
import Sidebar from './Sidebar';
import TechnicianDashboard from './technician/TechnicianDashboard';

export default function Technician() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role;

  const queue = useTechnicianQueue(user?.id, user?.phone);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (userRole && userRole !== 'technician') {
      navigate(getHomePath(userRole));
    }
  }, [user, userRole, navigate]);

  if (queue.loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <TechnicianDashboard user={user} {...queue} />
    </div>
  );
}
