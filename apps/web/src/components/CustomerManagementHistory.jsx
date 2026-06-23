import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';
import { getCustomerDetailPath } from '@nail-couture/shared/utils/routes';
import { canAccessStaffCrm } from '@nail-couture/shared/utils/staffCustomerAccess';
import { ROLE_LABELS, formatPhone, formatProfileDate } from '@nail-couture/shared/utils/roleLabels';
import { getStaffProfilePath } from '../utils/routes';

const STAFF_PROFILE_ROLES = ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'];
const PROFILE_SEARCH_LIMIT = 50;

const PAGE_TABS = [
  { id: 'history', label: 'Customer History' },
  { id: 'profiles', label: 'Profile Search', superAdminOnly: true },
  { id: 'registry', label: 'Registered Profiles', superAdminOnly: true },
];

function escapeIlike(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

function getProfileNavigationPath(viewerRole, profile) {
  const role = profile.role?.toString().trim().toLowerCase();
  if (role === 'customer') return getCustomerDetailPath(viewerRole, profile.id);
  if (STAFF_PROFILE_ROLES.includes(role)) return getStaffProfilePath(viewerRole, profile.id);
  return null;
}

const statusConfig = {
  waiting: { label: 'Waiting', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50', dot: 'bg-yellow-400' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50', dot: 'bg-blue-400' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50', dot: 'bg-green-400' },
  ready_for_checkout: { label: 'At Checkout', color: 'bg-amber-900/50 text-amber-300 border-amber-700/50', dot: 'bg-amber-400' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30', dot: 'bg-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50', dot: 'bg-red-500' },
};

export default function CustomerManagementHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [dateFilterType, setDateFilterType] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('history');
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [profileSearchResults, setProfileSearchResults] = useState([]);
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState('');
  const [registrySort, setRegistrySort] = useState('newest');
  const [registryProfiles, setRegistryProfiles] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registryPage, setRegistryPage] = useState(1);
  const [registryTotalCount, setRegistryTotalCount] = useState(0);

  const isVisitInTimeFrame = (visitDateString, filterType, startDate, endDate) => {
    if (!visitDateString) return false;
    const visitDate = new Date(visitDateString);
    if (isNaN(visitDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (filterType) {
      case 'today':
        return visitDate.toDateString() === today.toDateString();
      case 'this_week': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return visitDate >= sevenDaysAgo && visitDate <= today;
      }
      case 'custom': {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return visitDate >= start && visitDate <= end;
      }
      default:
        return true;
    }
  };

  const fetchCustomers = useCallback(async () => {
    if (!user?.role) {
      setLoading(false);
      navigate('/portal');
      return;
    }
    const normalizedRole = user.role.toString().trim().toLowerCase();
    if (!canAccessStaffCrm(normalizedRole)) {
      setLoading(false);
      navigate('/portal');
      return;
    }

    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .order('full_name');
      if (profilesError) throw profilesError;

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`*, services:appointments_service_id_fkey!left(*), technicians:profiles!appointments_technician_id_fkey!left(*)`)
        .order('completed_at', { ascending: false, nullsFirst: false });
      if (appointmentsError) throw appointmentsError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_transactions')
        .select('appointment_id, customer_id, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (paymentsError) throw paymentsError;

      const checkoutByAppointment = {};
      (paymentsData || []).forEach((payment) => {
        if (payment.appointment_id && !checkoutByAppointment[payment.appointment_id]) {
          checkoutByAppointment[payment.appointment_id] = payment.created_at;
        }
      });

      const customerMap = new Map();
      profilesData.forEach(profile => {
        const normalizedRole = profile.role?.toString().trim().toLowerCase() || '';
        if (normalizedRole === 'customer') {
          customerMap.set(profile.id, { ...profile, visits: [], totalVisits: 0, totalSpent: 0, lastCheckout: null });
        }
      });

      const appointmentsWithProfiles = appointmentsData.map(appointment => {
        const customerId = appointment.customer_id;
        if (!customerMap.has(customerId)) return null;
        return appointment;
      }).filter(Boolean);

      appointmentsWithProfiles.forEach(appointment => {
        const customerId = appointment.customer_id;
        const customer = customerMap.get(customerId);
        const addOnNames = appointment.add_ons ? appointment.add_ons.split(',').map((name) => name.trim()).filter(Boolean) : [];
        const primaryServiceName = appointment.services?.name || 'Unknown Service';
        const serviceList = [primaryServiceName, ...addOnNames].filter((name, index, arr) => name && arr.indexOf(name) === index);

        const checkoutAt = appointment.completed_at || checkoutByAppointment[appointment.id] || null;

        const visit = {
          id: appointment.id,
          date: checkoutAt || appointment.checked_in_at || appointment.scheduled_at,
          checkoutAt,
          service: appointment.services ? { name: primaryServiceName, price: appointment.services.price, duration: appointment.services.duration_minutes } : { name: primaryServiceName, price: 0, duration: 0 },
          serviceSummary: serviceList.join(', '),
          addOns: addOnNames,
          technician: appointment.technicians ? { id: appointment.technicians.id, name: appointment.technicians.full_name, role: appointment.technicians.role } : { id: null, name: 'Unassigned', role: null },
          status: appointment.status,
          finalPrice: appointment.final_price || 0,
          discount: { amount: appointment.discount_amount || 0, reason: appointment.discount_reason || '', authorizedBy: appointment.discount_authorized_by || 'System' }
        };

        customer.visits.push(visit);

        if (appointment.status === 'completed') {
          customer.totalVisits += 1;
          customer.totalSpent += (appointment.final_price || 0);
          if (checkoutAt) {
            const checkoutDate = new Date(checkoutAt);
            if (!customer.lastCheckout || checkoutDate > new Date(customer.lastCheckout)) {
              customer.lastCheckout = checkoutAt;
            }
          }
        }
      });

      const customersArray = Array.from(customerMap.values());

      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const searchProfiles = useCallback(async (term) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setProfileSearchResults([]);
      setProfileSearchError('');
      return;
    }

    setProfileSearchLoading(true);
    setProfileSearchError('');
    try {
      const escaped = escapeIlike(trimmed);
      const digits = trimmed.replace(/\D/g, '');
      const filters = [
        `full_name.ilike.%${escaped}%`,
        `email.ilike.%${escaped}%`,
        `phone.ilike.%${escaped}%`,
      ];
      if (digits.length >= 3 && digits !== escaped) {
        filters.push(`phone.ilike.%${escapeIlike(digits)}%`);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .or(filters.join(','))
        .order('full_name')
        .limit(PROFILE_SEARCH_LIMIT);

      if (error) throw error;
      setProfileSearchResults(data || []);
    } catch (error) {
      console.error('Error searching profiles:', error);
      setProfileSearchResults([]);
      setProfileSearchError(error.message || 'Could not search profiles.');
    } finally {
      setProfileSearchLoading(false);
    }
  }, []);

  const fetchRegisteredProfiles = useCallback(async () => {
    if (!isSuperAdmin) return;

    setRegistryLoading(true);
    setRegistryError('');
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at', { count: 'exact' });

      switch (registrySort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'az':
          query = query.order('full_name', { ascending: true });
          break;
        case 'za':
          query = query.order('full_name', { ascending: false });
          break;
        case 'role':
          query = query.order('role', { ascending: true }).order('full_name', { ascending: true });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const from = (registryPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      setRegistryProfiles(data || []);
      setRegistryTotalCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching registered profiles:', error);
      setRegistryProfiles([]);
      setRegistryTotalCount(0);
      setRegistryError(error.message || 'Could not load registered profiles.');
    } finally {
      setRegistryLoading(false);
    }
  }, [isSuperAdmin, registrySort, registryPage, itemsPerPage]);

  useEffect(() => {
    if (activeTab !== 'profiles' || !isSuperAdmin) return undefined;
    const timer = setTimeout(() => {
      searchProfiles(profileSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, isSuperAdmin, profileSearchTerm, searchProfiles]);

  useEffect(() => {
    if (activeTab !== 'registry' || !isSuperAdmin) return undefined;
    fetchRegisteredProfiles();
  }, [activeTab, isSuperAdmin, fetchRegisteredProfiles]);

  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'profiles' || activeTab === 'registry')) {
      setActiveTab('history');
    }
  }, [isSuperAdmin, activeTab]);

  const searchFilteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(customer =>
      customer.full_name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.phone.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const dateFilteredCustomers = useMemo(() => {
    if (dateFilterType === 'all') return searchFilteredCustomers;
    return searchFilteredCustomers.filter(customer =>
      customer.visits.some(visit => isVisitInTimeFrame(visit.date, dateFilterType, customStartDate, customEndDate))
    );
  }, [searchFilteredCustomers, dateFilterType, customStartDate, customEndDate]);

  const sortedCustomers = useMemo(() => {
    let sorted = [...dateFilteredCustomers];
    switch (sortBy) {
      case 'spend_desc':
        sorted.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case 'visits_desc':
        sorted.sort((a, b) => b.totalVisits - a.totalVisits);
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const dateA = a.lastCheckout ? new Date(a.lastCheckout).getTime() : 0;
          const dateB = b.lastCheckout ? new Date(b.lastCheckout).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'az':
      default:
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return sorted;
  }, [dateFilteredCustomers, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / itemsPerPage));
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCustomers, currentPage, itemsPerPage]);

  const summaryStats = useMemo(() => {
    const totalCustomers = sortedCustomers.length;
    const totalVisits = sortedCustomers.reduce((sum, customer) => sum + customer.totalVisits, 0);
    const totalSpent = sortedCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    return { totalCustomers, totalVisits, totalSpent };
  }, [sortedCustomers]);

  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleSortChange = (e) => { setSortBy(e.target.value); setCurrentPage(1); };
  const handleDateFilterChange = (e) => {
    setDateFilterType(e.target.value);
    setCurrentPage(1);
    if (e.target.value !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); }
  };
  const handleCustomStartDateChange = (e) => { setCustomStartDate(e.target.value); setCurrentPage(1); };
  const handleCustomEndDateChange = (e) => { setCustomEndDate(e.target.value); setCurrentPage(1); };
  const goToPreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const goToNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const goToPage = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const visibleTabs = PAGE_TABS.filter((tab) => !tab.superAdminOnly || isSuperAdmin);

  const handleProfileClick = (profile) => {
    const path = getProfileNavigationPath(user?.role, profile);
    if (path) navigate(path);
  };

  const registryTotalPages = Math.max(1, Math.ceil(registryTotalCount / itemsPerPage));
  const handleRegistrySortChange = (e) => {
    setRegistrySort(e.target.value);
    setRegistryPage(1);
  };
  const goToRegistryPreviousPage = () => {
    if (registryPage > 1) setRegistryPage(registryPage - 1);
  };
  const goToRegistryNextPage = () => {
    if (registryPage < registryTotalPages) setRegistryPage(registryPage + 1);
  };
  const goToRegistryPage = (page) => {
    if (page >= 1 && page <= registryTotalPages) setRegistryPage(page);
  };

  const renderProfileListItem = (profile) => {
    const profilePath = getProfileNavigationPath(user?.role, profile);
    const roleKey = profile.role?.toString().trim().toLowerCase() || '';
    const displayName = profile.full_name || 'Unnamed profile';
    return (
      <div
        key={profile.id}
        role={profilePath ? 'button' : undefined}
        tabIndex={profilePath ? 0 : undefined}
        className={clsx(
          'border-b border-light pb-4 last:border-0 p-3 rounded-xl transition-colors duration-200',
          profilePath ? 'cursor-pointer hover:bg-gold/5' : 'opacity-80',
        )}
        onClick={() => profilePath && handleProfileClick(profile)}
        onKeyDown={(e) => profilePath && e.key === 'Enter' && handleProfileClick(profile)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-primary font-heading capitalize">{displayName}</div>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-gold/30 text-gold">
                    {ROLE_LABELS[roleKey] || roleKey || 'Unknown'}
                  </span>
                </div>
                <div className="text-primary/80 text-sm truncate">{profile.email || 'No email'}</div>
                <div className="text-secondary text-xs">{formatPhone(profile.phone)}</div>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-secondary text-xs">Joined</div>
            <div className="text-primary/80 text-sm">{formatProfileDate(profile.created_at)}</div>
            {profilePath && <div className="text-gold text-sm whitespace-nowrap mt-2">View profile →</div>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading Customer Data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-6">
        <div className="mb-6">
          <h1 className="font-heading text-3xl text-gold">Customer Management History</h1>
          {visibleTabs.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-sm font-heading uppercase tracking-wider border transition-colors',
                    activeTab === tab.id
                      ? 'bg-gold/15 border-gold text-gold'
                      : 'border-light text-secondary hover:border-gold/40',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'profiles' && isSuperAdmin && (
          <>
            <div className="bg-secondary border-card rounded-xl border p-6 mb-4">
              <label className="text-primary text-sm font-semibold tracking-widest block mb-2">Search All Profiles</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name, phone, or email"
                  value={profileSearchTerm}
                  onChange={(e) => setProfileSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 8a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
              </div>
              <p className="text-secondary text-xs mt-3">
                Searches every profile in the database — customers, staff, and other roles.
              </p>
            </div>

            {profileSearchLoading && (
              <div className="text-center py-12">
                <div className="text-gold animate-pulse">Searching profiles...</div>
              </div>
            )}

            {!profileSearchLoading && profileSearchError && (
              <div className="text-center py-12">
                <p className="text-red-400 text-sm">{profileSearchError}</p>
              </div>
            )}

            {!profileSearchLoading && !profileSearchError && !profileSearchTerm.trim() && (
              <div className="text-center py-12">
                <div className="text-secondary text-4xl mb-4">&#128269;</div>
                <h2 className="font-heading text-2xl text-primary mb-2">Search the database</h2>
                <p className="text-primary/80 text-sm">Enter a name, phone number, or email to find any profile.</p>
              </div>
            )}

            {!profileSearchLoading && !profileSearchError && profileSearchTerm.trim() && profileSearchResults.length === 0 && (
              <div className="text-center py-12">
                <div className="text-secondary text-4xl mb-4">&#128230;</div>
                <h2 className="font-heading text-2xl text-primary mb-2">No profiles found</h2>
                <p className="text-primary/80 text-sm">No profiles match &ldquo;{profileSearchTerm.trim()}&rdquo;</p>
              </div>
            )}

            {!profileSearchLoading && !profileSearchError && profileSearchResults.length > 0 && (
              <div className="space-y-4">
                <p className="text-secondary text-xs uppercase tracking-widest">
                  {profileSearchResults.length} result{profileSearchResults.length === 1 ? '' : 's'}
                  {profileSearchResults.length >= PROFILE_SEARCH_LIMIT ? ` (showing first ${PROFILE_SEARCH_LIMIT})` : ''}
                </p>
                {profileSearchResults.map(renderProfileListItem)}
              </div>
            )}
          </>
        )}

        {activeTab === 'registry' && isSuperAdmin && (
          <>
            <div className="bg-secondary border-card rounded-xl border p-6 mb-4">
              <label className="text-primary text-sm font-semibold tracking-widest block mb-2">Sort Profiles</label>
              <div className="relative max-w-md">
                <select
                  value={registrySort}
                  onChange={handleRegistrySortChange}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none appearance-none pr-10"
                >
                  <option value="newest">Newest Registered</option>
                  <option value="oldest">Oldest Registered</option>
                  <option value="az">A-Z (Name)</option>
                  <option value="za">Z-A (Name)</option>
                  <option value="role">Role, then Name</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-secondary text-xs mt-3">
                Browse every profile in the database, sorted by registration date, name, or role.
              </p>
            </div>

            {registryLoading && (
              <div className="text-center py-12">
                <div className="text-gold animate-pulse">Loading registered profiles...</div>
              </div>
            )}

            {!registryLoading && registryError && (
              <div className="text-center py-12">
                <p className="text-red-400 text-sm">{registryError}</p>
              </div>
            )}

            {!registryLoading && !registryError && registryProfiles.length === 0 && (
              <div className="text-center py-12">
                <div className="text-secondary text-4xl mb-4">&#128230;</div>
                <h2 className="font-heading text-2xl text-primary mb-2">No profiles found</h2>
                <p className="text-primary/80 text-sm">There are no registered profiles in the database.</p>
              </div>
            )}

            {!registryLoading && !registryError && registryProfiles.length > 0 && (
              <div className="space-y-4">
                <p className="text-secondary text-xs uppercase tracking-widest">
                  {registryTotalCount} registered profile{registryTotalCount === 1 ? '' : 's'}
                </p>
                {registryProfiles.map(renderProfileListItem)}
              </div>
            )}

            {!registryLoading && !registryError && registryTotalCount > itemsPerPage && (
              <div className="flex items-center justify-between px-4 py-3 bg-secondary rounded-xl border border-light">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goToRegistryPreviousPage}
                    disabled={registryPage === 1}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                      registryPage === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gold/10',
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <span className="text-primary/80 text-xs uppercase tracking-widest">
                    Page {registryPage} of {registryTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={goToRegistryNextPage}
                    disabled={registryPage === registryTotalPages}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                      registryPage === registryTotalPages ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gold/10',
                    )}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                {registryTotalPages > 5 && (
                  <div className="relative">
                    <select
                      value={registryPage}
                      onChange={(e) => goToRegistryPage(parseInt(e.target.value, 10))}
                      className="w-20 px-3 py-2 bg-input border-input border rounded-xl text-primary focus:border-gold focus:outline-none"
                    >
                      {[...Array(registryTotalPages)].map((_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
        <div className="bg-secondary border-card rounded-xl border p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-primary text-sm font-semibold tracking-widest block mb-2">Search Customers</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="    Name, Phone or Email"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 8a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="text-primary text-sm font-semibold tracking-widest block mb-2">Sort By</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none appearance-none pr-10"
                >
                  <option value="recent">Recent Checkout</option>
                  <option value="az">A-Z (Name)</option>
                  <option value="spend_desc">Highest Spend</option>
                  <option value="visits_desc">Most Visits</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div>
              <label className="text-primary text-sm font-semibold tracking-widest block mb-2">Date Tracking</label>
              <div className="relative">
                <select
                  value={dateFilterType}
                  onChange={handleDateFilterChange}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none appearance-none pr-10"
                >
                  <option value="today">Today</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          {dateFilterType === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-primary text-sm font-semibold tracking-widest block mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={handleCustomStartDateChange}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-primary text-sm font-semibold tracking-widest block mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={handleCustomEndDateChange}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
        <div className="bg-secondary border-card rounded-xl border p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-secondary text-xs uppercase tracking-widest">ELITE CUSTOMERS</div>
              <div className="text-gold font-heading text-2xl">{summaryStats.totalCustomers}</div>
            </div>
            <div>
              <div className="text-secondary text-xs uppercase tracking-widest">TOTAL VISITS</div>
              <div className="text-primary font-heading text-xl">{summaryStats.totalVisits}</div>
            </div>
            <div>
              <div className="text-secondary text-xs uppercase tracking-widest">REVENUE GENERATED</div>
              <div className="text-gold font-heading text-xl">${summaryStats.totalSpent.toFixed(2)}</div>
            </div>
          </div>
        </div>
        {sortedCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-secondary text-4xl mb-4">&#128230;</div>
            <h2 className="font-heading text-2xl text-primary mb-2">No Records Match</h2>
            <p className="text-primary/80 text-sm">No elite records match your criteria or chosen date range</p>
          </div>
        )}
        {sortedCustomers.length > 0 && (
          <div className="space-y-4">
            {paginatedCustomers.map((customer) => (
              <div
                key={customer.id}
                role="button"
                tabIndex={0}
                className="border-b border-light pb-4 last:border-0 cursor-pointer hover:bg-gold/5 transition-colors duration-200 p-3 rounded-xl"
                onClick={() => navigate(getCustomerDetailPath(user?.role, customer.id))}
                onKeyDown={(e) => e.key === 'Enter' && navigate(getCustomerDetailPath(user?.role, customer.id))}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                        {customer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-primary font-heading capitalize">{customer.full_name}</div>
                        <div className="text-primary/80 text-sm">{customer.email}</div>
                        <div className="text-secondary text-xs">{customer.phone}</div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-primary font-heading">{customer.totalVisits}</div>
                      <div className="text-primary/80 text-xs">Visits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gold font-heading">${customer.totalSpent.toFixed(2)}</div>
                      <div className="text-primary/80 text-xs">Spent</div>
                    </div>
                  </div>
                  <div className="text-gold text-sm whitespace-nowrap">View profile →</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {sortedCustomers.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 bg-secondary rounded-xl border border-light">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  currentPage === 1 ? "opacity-20 cursor-not-allowed" : "hover:bg-gold/10"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-primary/80 text-xs uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  currentPage === totalPages ? "opacity-20 cursor-not-allowed" : "hover:bg-gold/10"
                )}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                </svg>
              </button>
            </div>
            {totalPages > 5 && (
              <div className="relative">
                <select
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-20 px-3 py-2 bg-input border-input border rounded-xl text-primary focus:border-gold focus:outline-none"
                >
                  {[...Array(totalPages)].map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
