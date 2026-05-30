import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const statusConfig = {
  waiting: { label: 'Waiting', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50', dot: 'bg-yellow-400' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50', dot: 'bg-blue-400' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50', dot: 'bg-green-400' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30', dot: 'bg-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50', dot: 'bg-red-500' },
};

export default function CustomerManagementHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'spend_desc', 'visits_desc', 'recent', 'az'
  const [dateFilterType, setDateFilterType] = useState('today'); // 'all', 'today', 'this_week', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerVisits, setCustomerVisits] = useState({});

  // Helper function to check if a visit date is within the selected timeframe
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
        sevenDaysAgo.setDate(today.getDate() - 6); // Including today, last 7 days
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return visitDate >= sevenDaysAgo && visitDate <= today;
      }
      case 'custom': {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end day
        return visitDate >= start && visitDate <= end;
      }
      default:
        return true; // 'all'
    }
  };

  // Process raw data from Supabase into customer objects with visits
  const fetchCustomers = useCallback(async () => {
    // Only allow management roles to access customer history
    if (!user?.role) { 
      setLoading(false); 
      navigate('/portal'); 
      return; 
    }
    
    // Normalize role for comparison (trim and lowercase)
    const normalizedRole = user.role.toString().trim().toLowerCase();
    const managementRoles = ['super_admin', 'owner', 'partner'];
    if (!managementRoles.includes(normalizedRole)) { 
      setLoading(false); 
      navigate('/portal'); 
      return; 
    }

    try {
      // Fetch all profiles (we'll filter for customers in JavaScript to handle role variations)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all appointments with related data using explicit foreign key paths to avoid ambiguous relationship loops
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          services:appointments_service_id_fkey!left(*),
          technicians:profiles!appointments_technician_id_fkey!left(*)
        `)
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Process data: group appointments by customer
      const customerMap = new Map();

      // Initialize customer data from profiles (only include actual customers)
      profilesData.forEach(profile => {
        // Normalize role for customer check (handle case variations and whitespace)
        const normalizedRole = profile.role?.toString().trim().toLowerCase() || '';
        if (normalizedRole === 'customer') {
          customerMap.set(profile.id, {
            ...profile,
            visits: [],
            totalVisits: 0,
            totalSpent: 0,
            lastVisit: null
          });
        }
      });

      // Add appointments to respective customers
      appointmentsData.forEach(appointment => {
        const customerId = appointment.customer_id;
        if (customerMap.has(customerId)) {
          const customer = customerMap.get(customerId);
          
          // Format appointment data with proper null handling for LEFT JOINS
          // Extract discount info directly from appointment table (flat columns)
          const visit = {
            id: appointment.id,
            date: appointment.scheduled_at || appointment.checked_in_at,
            service: appointment.services ? {
              name: appointment.services.name,
              price: appointment.services.price,
              duration: appointment.services.duration_minutes
            } : { name: 'Unknown Service', price: 0, duration: 0 },
            technician: appointment.technicians ? {
              id: appointment.technicians.id,
              name: appointment.technicians.full_name,
              role: appointment.technicians.role
            } : { id: null, name: 'Unassigned', role: null },
            status: appointment.status,
            finalPrice: appointment.final_price,
            discount: {
              amount: appointment.discount_amount || 0,
              reason: appointment.discount_reason || '',
              authorizedBy: appointment.discount_authorized_by || 'System'
            }
          };
          
          customer.visits.push(visit);
          
          // Update totals (only for completed visits)
          if (appointment.status === 'completed') {
            customer.totalVisits += 1;
            customer.totalSpent += (appointment.final_price || 0);
            
            const visitDate = new Date(appointment.scheduled_at || appointment.checked_in_at);
            if (!customer.lastVisit || visitDate > new Date(customer.lastVisit)) {
              customer.lastVisit = appointment.scheduled_at || appointment.checked_in_at;
            }
          }
        } else {
          // Log warning for appointments with customer_id not found in profiles
          console.warn('Appointment has customer_id not found in profiles:', appointment.customer_id, appointment.id);
        }
      });

      // Convert map to array and filter out customers with no visits
      const customersArray = Array.from(customerMap.values())
        .filter(customer => customer.visits.length > 0) // Only show customers with visits
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

  // Apply search filter
  const searchFilteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(customer => 
      customer.full_name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.phone.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  // Apply date filter
  const dateFilteredCustomers = useMemo(() => {
    if (dateFilterType === 'all') return searchFilteredCustomers;
    
    return searchFilteredCustomers.filter(customer => {
      // Check if at least one visit matches the date filter
      return customer.visits.some(visit => 
        isVisitInTimeFrame(visit.date, dateFilterType, customStartDate, customEndDate)
      );
    });
  }, [searchFilteredCustomers, dateFilterType, customStartDate, customEndDate]);

  // Apply sorting
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
          return dateB - dateA; // Most recent first
        });
        break;
      case 'az':
      default:
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return sorted;
  }, [dateFilteredCustomers, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / itemsPerPage));
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCustomers, currentPage, itemsPerPage]);

  // Summary statistics (based on filtered and sorted customers)
  const summaryStats = useMemo(() => {
    const totalCustomers = sortedCustomers.length;
    const totalVisits = sortedCustomers.reduce((sum, customer) => sum + customer.totalVisits, 0);
    const totalSpent = sortedCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    return { totalCustomers, totalVisits, totalSpent };
  }, [sortedCustomers]);

  // Handle search change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1); // Reset to first page on new sort
  };

  // Handle date filter change
  const handleDateFilterChange = (e) => {
    setDateFilterType(e.target.value);
    setCurrentPage(1); // Reset to first page on new date filter
    // If switching away from custom, clear custom dates
    if (e.target.value !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Handle custom date changes
  const handleCustomStartDateChange = (e) => {
    setCustomStartDate(e.target.value);
    setCurrentPage(1); // Reset to first page on new date
  };

  const handleCustomEndDateChange = (e) => {
    setCustomEndDate(e.target.value);
    setCurrentPage(1); // Reset to first page on new date
  };

  // Pagination handlers
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading Customer Data...</div>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-6">
          <div className="mb-6">
            <h1 className="font-heading text-3xl text-gold">Customer Management History</h1>
          </div>
          {/* Luxury Control Deck */}
        <div className="bg-offwhite/3 rounded-xl border border-gold/10 p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {/* Search Input */}
            <div>
              <label className="text-offwhite/60 text-sm font-semibold tracking-widest block mb-2">Search Customers</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="	 Name, Phone or Email"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-3 bg-offwhite/5 border border-gold/20 rounded-xl text-offwhite placeholder-offwhite/50 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 8a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
              </div>
            </div>
            
            {/* Sort By Dropdown */}
            <div>
              <label className="text-offwhite/60 text-sm font-semibold tracking-widest block mb-2">Sort By</label>
              <div className="relative">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="w-full px-4 py-3 bg-[#121212] border border-gold/20 rounded-xl text-offwhite placeholder-offwhite/50 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%23c5a059%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')] bg-right-[0.75rem] bg-center-no-repeat bg-[contain]"
              >
				<option value="recent" style={{ backgroundColor: '#121212', color: '#fafafa' }}>Recent Visits</option>
                <option value="az" style={{ backgroundColor: '#121212', color: '#fafafa' }}>A-Z (Name)</option>
                <option value="spend_desc" style={{ backgroundColor: '#121212', color: '#fafafa' }}>Highest Spend</option>
                <option value="visits_desc" style={{ backgroundColor: '#121212', color: '#fafafa' }}>Most Visits</option>
                </select>
              </div>
            </div>
            
            {/* Date Tracking Dropdown */}
            <div>
              <label className="text-offwhite/60 text-sm font-semibold tracking-widest block mb-2">Date Tracking</label>
              <div className="relative">
                <select
                  value={dateFilterType}
                  onChange={handleDateFilterChange}
                  className="w-full px-4 py-3 bg-[#121212] border border-gold/20 rounded-xl text-offwhite placeholder-offwhite/50 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%23c5a059%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')] bg-right-[0.75rem] bg-center-no-repeat bg-[contain]"
                >
				  <option value="today" style={{ backgroundColor: '#121212', color: '#fafafa' }}>Today</option>
                  <option value="all" style={{ backgroundColor: '#121212', color: '#fafafa' }}>All Time</option>
                  <option value="custom" style={{ backgroundColor: '#121212', color: '#fafafa' }}>Custom Range</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Custom Date Inputs (conditional, full width) */}
          {dateFilterType === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-offwhite/60 text-sm font-semibold tracking-widest block mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={handleCustomStartDateChange}
                  className="w-full px-4 py-3 bg-offwhite/5 border border-gold/20 rounded-xl text-offwhite placeholder-offwhite/50 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-offwhite/60 text-sm font-semibold tracking-widest block mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={handleCustomEndDateChange}
                  className="w-full px-4 py-3 bg-offwhite/5 border border-gold/20 rounded-xl text-offwhite placeholder-offwhite/50 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Ribbon */}
        <div className="bg-offwhite/3 rounded-xl border border-gold/5 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest">ELITE CUSTOMERS</div>
              <div className="text-gold font-heading text-2xl">{summaryStats.totalCustomers}</div>
            </div>
            <div>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest">TOTAL VISITS</div>
              <div className="text-offwhite font-heading text-xl">{summaryStats.totalVisits}</div>
            </div>
            <div>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest">REVENUE GENERATED</div>
              <div className="text-gold font-heading text-xl">${summaryStats.totalSpent.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {sortedCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-offwhite/30 text-4xl mb-4">&#128230;</div>
            <h2 className="font-heading text-2xl text-offwhite mb-2">No Records Match</h2>
            <p className="text-offwhite/50 text-sm">No elite records match your criteria or chosen date range</p>
          </div>
        )}

        {/* Paginated List View */}
        {sortedCustomers.length > 0 && (
          <div className="space-y-4">
            {paginatedCustomers.map((customer) => (
              <div key={customer.id} className="border-b border-gold/5 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2 cursor-pointer hover:bg-gold/5 transition-colors duration-200 p-3 rounded-xl" onClick={() => setSelectedCustomer(selectedCustomer === customer.id ? null : customer.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                          {customer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-offwhite font-heading capitalize">{customer.full_name}</div>
                          <div className="text-offwhite/50 text-sm">{customer.email}</div>
                          <div className="text-offwhite/40 text-xs">{customer.phone}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-offwhite font-heading">{customer.totalVisits}</div>
                      <div className="text-offwhite/50 text-sm ml-2">Visits</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-gold font-heading">${customer.totalSpent.toFixed(2)}</div>
                      <div className="text-offwhite/50 text-sm ml-2">Total Spent</div>
                    </div>
                    <div className="text-right">
                      {selectedCustomer === customer.id ? (
                        <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-offwhite/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                {/* Visit History Accordion */}
                {selectedCustomer === customer.id && (
                  <div className="mt-4 p-4 bg-offwhite/5 rounded-xl border border-gold/10">
                    <div className="mb-3">
                      <div className="text-offwhite font-heading text-lg">Visit History</div>
                    </div>
                    {customer.visits.length === 0 ? (
                      <p className="text-offwhite/40 text-center py-4">No visit history available</p>
                    ) : (
                      <div className="space-y-2">
                        {customer.visits
                          // Sort visits by date (newest first)
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((visit) => (
                            <div key={visit.id} className="p-3 bg-offwhite/3 rounded-lg border border-gold/5 mb-2">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="text-offwhite font-heading">{visit.service.name}</div>
                                  <div className="text-offwhite/50 text-sm">Technician: {visit.technician.name}</div>
                                  <div className="text-offwhite/50 text-sm">
                                    {new Date(visit.date).toLocaleString('en-US', { 
                                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', 
                                      hour: '2-digit', minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-gold font-heading">${visit.finalPrice.toFixed(2)}</div>
                                  {visit.discount.amount !== 0 && (
                                    <div className="text-offwhite/40 text-xs mt-1">
                                      Discount: -${visit.discount.amount} ({visit.discount.reason})<br/>
                                      Authorized by: Staff ID {visit.discount.authorizedBy || 'Unknown'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {sortedCustomers.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 bg-offwhite/3 rounded-xl border border-gold/5">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  currentPage === 1 
                    ? 'opacity-20 cursor-not-allowed' 
                    : 'hover:bg-gold/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-offwhite/60 text-xs uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  currentPage === totalPages 
                    ? 'opacity-20 cursor-not-allowed' 
                    : 'hover:bg-gold/10'
                }`}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                </svg>
              </button>
            </div>
            {/* Optional: Page jump dropdown for large datasets */}
            {totalPages > 5 && (
              <div className="relative">
                <select
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-20 px-3 py-2 bg-offwhite/10 border border-offwhite/20 rounded-xl text-offwhite focus:border-gold focus:outline-none"
                >
                  {[...Array(totalPages)].map((_, i) => (
                    <option key={i} value={i+1}>
                      {i+1}
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