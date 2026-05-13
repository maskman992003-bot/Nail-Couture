import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

const statusOptions = ['pending', 'confirmed', 'completed', 'noshow'];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  noshow: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  noshow: 'No-Show',
};

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch = searchTerm === '' || 
        booking.phone.includes(searchTerm) ||
        booking.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  const updateStatus = (id, newStatus) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, status: newStatus } : booking
      )
    );
  };

  const totalRevenue = filteredBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    noshow: bookings.filter((b) => b.status === 'noshow').length,
  }), [bookings]);

  return (
    <div className="min-h-screen bg-offwhite">
      <nav className="bg-charcoal border-b border-gold/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/"><img src="/NC.jpg" alt="Nail Couture" className="h-16 w-auto" /></Link>
            <span className="text-gold/60 text-sm">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/lobby" 
              className="px-4 py-2 bg-gold text-charcoal font-heading text-sm hover:bg-gold/90 transition-colors"
            >
              The Atelier Lobby
            </Link>
            <Link 
              to="/" 
              className="text-offwhite/60 hover:text-offwhite text-sm transition-colors"
            >
              ← Back to Site
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-charcoal text-3xl mb-2">Booking Management</h1>
          <p className="text-charcoal/60">Manage and track all appointments</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-charcoal/10 p-4 text-center">
            <div className="text-charcoal/50 text-sm mb-1">Total Bookings</div>
            <div className="text-charcoal text-2xl font-heading">{stats.total}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 text-center">
            <div className="text-yellow-700 text-sm mb-1">Pending</div>
            <div className="text-charcoal text-2xl font-heading">{stats.pending}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 text-center">
            <div className="text-blue-700 text-sm mb-1">Confirmed</div>
            <div className="text-charcoal text-2xl font-heading">{stats.confirmed}</div>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 text-center">
            <div className="text-green-700 text-sm mb-1">Completed</div>
            <div className="text-charcoal text-2xl font-heading">{stats.completed}</div>
          </div>
          <div className="bg-red-50 border border-red-200 p-4 text-center">
            <div className="text-red-700 text-sm mb-1">No-Shows</div>
            <div className="text-charcoal text-2xl font-heading">{stats.noshow}</div>
          </div>
        </div>

        <div className="bg-white border border-charcoal/10 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Search by Phone or Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter phone number or name..."
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="noshow">No-Show</option>
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Total Revenue
              </label>
              <div className="p-3 bg-charcoal text-gold font-heading text-xl">
                ${totalRevenue}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-charcoal/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-charcoal text-offwhite">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date & Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Customer Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-charcoal/50">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-offwhite/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-sm text-charcoal font-medium">
                          {new Date(booking.date).toLocaleDateString('en-US', { 
                            weekday: 'short', month: 'short', day: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-charcoal/50">{booking.time}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-charcoal font-medium">{booking.customerName}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-charcoal">{booking.phone}</div>
                        <div className="text-xs text-charcoal/50">{booking.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-charcoal">{booking.service}</div>
                        {booking.addOns.length > 0 && (
                          <div className="text-xs text-gold">
                            + {booking.addOns.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm text-charcoal font-heading">${booking.totalPrice}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <select
                            value={booking.status}
                            onChange={(e) => updateStatus(booking.id, e.target.value)}
                            className={`px-3 py-1 text-sm border-2 rounded-none cursor-pointer focus:outline-none ${statusColors[booking.status]}`}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-charcoal/50">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>
    </div>
  );
}
