import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { useFloorSnapshot } from '@nail-couture/shared/hooks/useFloorSnapshot';
import TechnicianFloorSnapshot from './technician/TechnicianFloorSnapshot';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';

export default function CashierLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { floorAppointments, floorTechnicians, loading, refetch } = useFloorSnapshot(user?.phone);

  useRegisterPullToRefresh(() => refetch(false));

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role && user.role !== 'cashier') {
      navigate(getHomePath(user.role));
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading lobby...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <div className="technician-dashboard p-4 md:p-6 lg:p-8 mobile-page">
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-primary">Lobby</h1>
            <p className="text-secondary text-sm mt-1">Live floor snapshot</p>
          </div>

          <TechnicianFloorSnapshot
            floorAppointments={floorAppointments}
            floorTechnicians={floorTechnicians}
          />
        </div>
      </div>
    </div>
  );
}
