import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';
import { getCustomerDetailPath } from '../utils/routes';
import { canAccessStaffCrm } from '../utils/staffCustomerAccess';

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
        .order('created_at', { ascending: false });
      if (appointmentsError) throw appointmentsError;

      const customerMap = new Map();
      profilesData.forEach(profile => {
        const normalizedRole = profile.role?.toString().trim().toLowerCase() || '';
        if (normalizedRole === 'customer') {
          customerMap.set(profile.id, { ...profile, visits: [], totalVisits: 0, totalSpent: 0, lastVisit: null });
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

        const visit = {
          id: appointment.id,
          date: appointment.scheduled_at || appointment.checked_in_at,
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
          const visitDate = new Date(appointment.scheduled_at || appointment.checked_in_at);
          if (!customer.lastVisit || visitDate > new Date(customer.lastVisit)) {
            customer.lastVisit = appointment.scheduled_at || appointment.checked_in_at;
          }
        }
      });

      const customersArray = Array.from(customerMap.values())
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

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
          const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
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
        </div>
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
                  <option value="recent">Recent Visits</option>
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
      </div>
    </div>
  );
}
