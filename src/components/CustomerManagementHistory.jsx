import { useState, useEffect, useCallback } from 'react';
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerVisits, setCustomerVisits] = useState({});

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
       console.log("Appointments Raw Data:", appointmentsData, appointmentsError);

       if (appointmentsError) {
         console.error('Appointments query error:', appointmentsError);
         throw appointmentsError;
       }
       
       // Log if we got no appointments data (could indicate RLS issue)
       if (!appointmentsData || appointmentsData.length === 0) {
         console.warn('No appointments data returned from query - possible RLS restriction or empty table');
       }

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
           
           // Update totals
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

       // Convert map to array and sort by name
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerVisits = (customerId) => {
    if (!customerVisits[customerId]) {
      return [];
    }
    return customerVisits[customerId];
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-3xl text-gold">Customer Management</h1>
            <p className="text-offwhite/60 text-sm mt-1">View customer profiles and visit histories</p>
          </div>
          <Link 
            to={user.role === 'super_admin' ? '/superadmin' : user.role === 'owner' ? '/owner' : '/partner'}
            className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="rounded-xl p-4 border border-gold/10">
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 px-4 py-3 bg-offwhite/10 border border-offwhite/20 rounded-xl text-offwhite focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 && searchTerm ? (
          <div className="text-center py-12">
            <p className="text-offwhite/40">No customers found matching "{searchTerm}"</p>
          </div>
        ) : filteredCustomers.length === 0 && !searchTerm ? (
          <div className="text-center py-12">
            <p className="text-offwhite/40">No customer visit data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="border-b border-gold/5 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setSelectedCustomer(selectedCustomer === customer.id ? null : customer.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                        {customer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-offwhite font-heading">{customer.full_name}</div>
                        <div className="text-offwhite/50 text-sm">{customer.email}</div>
                        <div className="text-offwhite/40 text-xs">{customer.phone}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-x-3">
                    <div className="text-offwhite font-heading">{customer.totalVisits}</div>
                    <div className="text-offwhite/50 text-sm">Visits</div>
                  </div>
                  <div className="text-right space-x-3">
                    <div className="text-gold font-heading">${customer.totalSpent.toFixed(2)}</div>
                    <div className="text-offwhite/50 text-sm">Total Spent</div>
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
                             .sort((a, b) => new Date(b.date) - new Date(a.date))
                             .map((visit) => (
                             <div key={visit.id} className="p-3 bg-offwhite/3 rounded-lg border border-gold/5 mb-2">
                               <div className="flex items-start justify-between mb-1">
                                 <div className="flex-1 min-w-0">
                                   <div className="text-offwhite font-heading">{visit.service.name}</div>
                                   <div className="text-offwhite/50 text-sm">Technician: {visit.technician.name}</div>
                                   <div className="text-offwhite/50 text-sm">
                                     {new Date(visit.date).toLocaleDateString('en-US', { 
                                       weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
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
      </div>
    </div>
  );
}