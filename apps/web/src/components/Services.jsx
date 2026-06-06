import { useAuth } from '../contexts/AuthContext';
import ServicesAdmin from './ServicesAdmin';
import ServicesPublic from './ServicesPublic';

export default function Services() {
  const { user } = useAuth();
  const isStaff = user?.is_staff || false;

  return isStaff ? <ServicesAdmin /> : <ServicesPublic />;
}