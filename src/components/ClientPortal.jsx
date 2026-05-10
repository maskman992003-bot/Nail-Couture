import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const upcomingBookings = [
  { id: 1, date: '2026-05-12', time: '10:00 AM', service: 'Gel-X Extensions with Custom Art', addOns: ['French Tip', 'Chrome Finish'], totalPrice: 135, status: 'confirmed', technician: 'Sasha' },
  { id: 2, date: '2026-05-20', time: '2:00 PM', service: 'The Signature Russian Manicure', addOns: ['Strength Layer'], totalPrice: 90, status: 'pending', technician: 'Mia' },
];

const bookingHistory = [
  { id: 3, date: '2026-04-21', time: '2:00 PM', service: 'Gel-X Extensions with Custom Art', addOns: ['French Tip', 'Chrome Finish'], totalPrice: 135, status: 'completed', technician: 'Sasha', colors: ['Nude Pink #12', 'Gold Chrome'], style: 'Almond Shape' },
  { id: 4, date: '2026-04-01', time: '11:00 AM', service: 'The Signature Russian Manicure', addOns: ['Strength Layer'], totalPrice: 90, status: 'completed', technician: 'Sasha', colors: ['Barely There'], style: 'Natural' },
  { id: 5, date: '2026-03-15', time: '10:00 AM', service: 'Luxury Spa Pedicure', addOns: ['Chrome Finish'], totalPrice: 80, status: 'completed', technician: 'Mia', colors: ['Coral Sunset'], style: 'Standard' },
  { id: 6, date: '2026-03-01', time: '3:00 PM', service: 'Gel-X Extensions', addOns: [], totalPrice: 100, status: 'completed', technician: 'Sasha', colors: ['Ruby Red'], style: 'Stiletto' },
  { id: 7, date: '2026-02-15', time: '10:00 AM', service: 'The Signature Russian Manicure', addOns: [], totalPrice: 80, status: 'completed', technician: 'Sasha', colors: ['Clear'], style: 'Square' },
];

const packagesData = [
  { id: 'pkg1', name: 'First Impression Package', description: 'Manicure + Pedicure + Hand Massage', originalPrice: 150, packagePrice: 135, savings: 10, includes: ['Signature Russian Manicure', 'Luxury Spa Pedicure', 'Relaxing Hand Massage'] },
  { id: 'pkg2', name: 'Bridal Party Bundle', description: 'Group booking for 4+ with Complimentary Toast', originalPrice: 0, packagePrice: 0, includes: ['4+ Bridal Party Members', 'Complimentary Champagne Toast', 'Coordinated Styling'], minPeople: 4 },
  { id: 'pkg3', name: 'Russian Routine Subscription', description: 'Pre-pay for 5 manicures, get the 6th free', originalPrice: 400, packagePrice: 320, savings: 20, includes: ['5 Signature Russian Manicures', '1 Free Manicure', 'Priority Scheduling'] },
];

const supportTickets = [
  { id: 1, date: '2026-04-21', type: 'suggestion', subject: 'Evening appointments', message: 'Would love more availability for evening appointments after work.', status: 'implemented' },
  { id: 2, date: '2026-03-15', type: 'complaint', subject: 'Wait time', message: 'Had to wait 20 minutes past my appointment time.', status: 'resolved' },
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Alexandra Chen',
    email: 'alexandra@email.com',
    phone: '5551234567',
    memberSince: 'January 2026',
    referralCode: 'ALEX2026',
    nailHealth: {
      condition: 'Strong & Healthy',
      notes: 'Natural nails growing well. Avoiding acrylics to allow breathing.',
      goals: ['Grow natural nails longer', 'Try gradient designs'],
      allergies: ['Strong fragrance scents', 'Latex gloves'],
    },
  });

  const [supportData, setSupportData] = useState(supportTickets);
  const [supportForm, setSupportForm] = useState({ type: 'suggestion', subject: '', message: '' });

  const allBookings = [...upcomingBookings, ...bookingHistory];
  
  const loyaltyStats = useMemo(() => {
    const completedBookings = bookingHistory.filter(b => b.status === 'completed');
    const totalSpent = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const visitCount = completedBookings.length;
    
    let tier = 'Silver';
    let tierBenefits = ['Standard booking', 'Earn 1 point per $1'];
    let pointsMultiplier = 1;
    let tierBadge = '🥈';

    if (visitCount >= 15) {
      tier = 'Couture VIP';
      tierBenefits = ['Priority booking', 'Free Luxury Add-on/month', '10% more points', 'Exclusive events'];
      pointsMultiplier = 1.1;
      tierBadge = '👑';
    } else if (visitCount >= 5) {
      tier = 'Gold';
      tierBenefits = ['Champagne Upgrade', '5% more points', 'Priority support'];
      pointsMultiplier = 1.05;
      tierBadge = '🥇';
    }

    const totalPoints = Math.floor(totalSpent * pointsMultiplier);
    const availableCredits = Math.floor(totalPoints / 100) * 5;
    const pointsToNextReward = 100 - (totalPoints % 100);

    return { tier, tierBadge, tierBenefits, visitCount, totalSpent, totalPoints, availableCredits, pointsToNextReward, progress: (totalPoints % 100), pointsMultiplier };
  }, []);

  const tierColors = {
    'Silver': 'from-gray-100 to-gray-200 border-gray-300',
    'Gold': 'from-yellow-100 to-amber-200 border-yellow-400',
    'Couture VIP': 'from-amber-100 to-yellow-200 border-amber-400',
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(profile.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportForm.subject || !supportForm.message) return;
    const newTicket = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: supportForm.type,
      subject: supportForm.subject,
      message: supportForm.message,
      status: 'pending',
    };
    setSupportData([newTicket, ...supportData]);
    setShowSupportModal(false);
    setSupportForm({ type: 'suggestion', subject: '', message: '' });
  };

  const handleRebook = (booking) => {
    navigate('/booking', { state: { rebookService: booking.service, rebookAddOns: booking.addOns } });
  };

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'loyalty', label: 'Loyalty', icon: '⭐' },
    { id: 'packages', label: 'Packages', icon: '🎁' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'support', label: 'Support', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-offwhite">
      <nav className="bg-charcoal border-b border-gold/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/"><img src="/src/assets/NC.jpg" alt="Nail Couture" className="h-16 w-auto" /></Link>
            <span className="text-gold/60 text-sm">My Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/booking" className="text-gold hover:text-gold/80 text-sm">Book Appointment</Link>
            <Link to="/" className="text-offwhite/60 hover:text-offwhite text-sm">← Back to Site</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white border border-charcoal/10 p-6 mb-6">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-charcoal font-heading text-2xl">{profile.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <h3 className="font-heading text-charcoal text-lg">{profile.name}</h3>
                <p className="text-charcoal/50 text-sm">{profile.email}</p>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">{loyaltyStats.tierBadge}</span>
                <span className={`px-3 py-1 border-2 text-sm font-heading ${tierColors[loyaltyStats.tier].split(' ')[0]} ${tierColors[loyaltyStats.tier].split(' ')[1]}`}>
                  {loyaltyStats.tier}
                </span>
              </div>
              <div className="text-center text-xs text-charcoal/50">{loyaltyStats.visitCount} visits</div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${activeTab === tab.id ? 'bg-charcoal text-offwhite' : 'text-charcoal/60 hover:bg-white hover:text-charcoal'}`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm tracking-wide">{tab.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'appointments' && (
              <div className="space-y-8">
                <div className="bg-white border border-charcoal/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-charcoal text-xl">Upcoming Appointments</h2>
                    <Link to="/booking" className="text-gold text-sm hover:underline">Book New</Link>
                  </div>
                  {upcomingBookings.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingBookings.map((booking) => (
                        <div key={booking.id} className="border border-charcoal/10 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-sm text-charcoal/50">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                              <div className="text-lg font-heading text-charcoal">{booking.time}</div>
                            </div>
                            <span className={`px-2 py-1 text-xs border ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
                          </div>
                          <div className="text-charcoal font-medium">{booking.service}</div>
                          <div className="text-sm text-gold">with {booking.technician}</div>
                          <div className="text-charcoal font-heading mt-2">${booking.totalPrice}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-charcoal/50">No upcoming appointments</p>
                  )}
                </div>

                <div className="bg-white border border-charcoal/10 p-6">
                  <h2 className="font-heading text-charcoal text-xl mb-4">Past Appointments</h2>
                  <div className="space-y-4">
                    {bookingHistory.map((booking) => (
                      <div key={booking.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-charcoal/10">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs border ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
                            <span className="text-charcoal/50 text-sm">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <h4 className="font-heading text-charcoal">{booking.service}</h4>
                          <p className="text-charcoal/60 text-sm">{booking.time} with {booking.technician}</p>
                          {booking.colors && booking.colors.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {booking.colors.map((color, idx) => (
                                <span key={idx} className="px-2 py-1 bg-charcoal/5 text-charcoal/70 text-xs">{color}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-heading text-charcoal text-xl mb-2">${booking.totalPrice}</div>
                          <button onClick={() => handleRebook(booking)} className="px-4 py-2 border border-gold text-gold hover:bg-gold hover:text-charcoal text-sm">Rebook</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'loyalty' && (
              <div className="space-y-6">
                <h2 className="font-heading text-charcoal text-xl">Loyalty Rewards</h2>
                
                <div className={`bg-gradient-to-br ${tierColors[loyaltyStats.tier]} border p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{loyaltyStats.tierBadge}</span>
                      <div>
                        <h3 className="font-heading text-charcoal text-2xl">{loyaltyStats.tier}</h3>
                        <p className="text-charcoal/60 text-sm">{loyaltyStats.visitCount} visits</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-heading text-charcoal">{loyaltyStats.totalPoints}</div>
                      <p className="text-charcoal/60 text-sm">Points</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-charcoal/60">Progress to reward</span>
                      <span className="text-charcoal">{loyaltyStats.pointsToNextReward} pts</span>
                    </div>
                    <div className="w-full bg-white/50 h-3 rounded-full overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${loyaltyStats.progress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-charcoal/10">
                    <div className="text-center">
                      <div className="text-2xl font-heading text-charcoal">${loyaltyStats.availableCredits}</div>
                      <div className="text-xs text-charcoal/50">Credit</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-heading text-charcoal">${loyaltyStats.totalSpent}</div>
                      <div className="text-xs text-charcoal/50">Spent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-heading text-charcoal">{Math.round(loyaltyStats.pointsMultiplier * 100)}%</div>
                      <div className="text-xs text-charcoal/50">Bonus</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-charcoal/10 p-6">
                  <h3 className="font-heading text-charcoal text-lg mb-4">Your Benefits</h3>
                  <ul className="space-y-2">
                    {loyaltyStats.tierBenefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-charcoal">
                        <span className="text-gold">✓</span> {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'packages' && (
              <div className="space-y-6">
                <h2 className="font-heading text-charcoal text-xl">Special Packages</h2>
                <p className="text-charcoal/60">Save on bundled services</p>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {packagesData.map((pkg) => (
                    <div key={pkg.id} className="bg-white border border-charcoal/10 p-6">
                      <div className="text-xs text-gold mb-2">{pkg.savings > 0 ? `Save ${pkg.savings}%` : pkg.minPeople ? 'Min 4 People' : 'Special'}</div>
                      <h3 className="font-heading text-charcoal text-lg mb-2">{pkg.name}</h3>
                      <p className="text-charcoal/60 text-sm mb-4">{pkg.description}</p>
                      <ul className="space-y-1 mb-4">
                        {pkg.includes.map((item, idx) => (
                          <li key={idx} className="text-sm text-charcoal/70 flex items-center gap-2">
                            <span className="text-gold">✓</span> {item}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-baseline gap-2">
                        {pkg.originalPrice > 0 ? (
                          <>
                            <span className="text-2xl font-heading text-gold">${pkg.packagePrice}</span>
                            <span className="text-charcoal/40 line-through">${pkg.originalPrice}</span>
                          </>
                        ) : (
                          <span className="text-xl font-heading text-gold">Custom Quote</span>
                        )}
                      </div>
                      <Link to="/booking" className="mt-4 block w-full text-center py-2 bg-gold text-charcoal font-medium hover:bg-gold/90">Book Package</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white border border-charcoal/10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading text-charcoal text-xl">Profile Information</h2>
                    <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-gold text-sm hover:underline">
                      {isEditingProfile ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Full Name</label>
                      {isEditingProfile ? (
                        <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none" />
                      ) : (
                        <p className="text-charcoal">{profile.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Email</label>
                      {isEditingProfile ? (
                        <input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none" />
                      ) : (
                        <p className="text-charcoal">{profile.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Phone</label>
                      {isEditingProfile ? (
                        <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none" />
                      ) : (
                        <p className="text-charcoal">{profile.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Referral Code</label>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-charcoal bg-offwhite px-3 py-2">{profile.referralCode}</span>
                        <button onClick={handleCopyCode} className="px-3 py-2 border border-charcoal/10 hover:border-gold text-sm">{copiedCode ? 'Copied!' : 'Copy'}</button>
                      </div>
                    </div>
                  </div>
                  {isEditingProfile && (
                    <div className="mt-6 pt-6 border-t border-charcoal/10">
                      <button onClick={() => setIsEditingProfile(false)} className="px-6 py-2 bg-gold text-charcoal font-medium hover:bg-gold/90">Save Changes</button>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-charcoal/10 p-6">
                  <h2 className="font-heading text-charcoal text-xl mb-6">Nail Health</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Condition</label>
                      <p className="text-charcoal">{profile.nailHealth.condition}</p>
                    </div>
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Notes</label>
                      <p className="text-charcoal">{profile.nailHealth.notes}</p>
                    </div>
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Goals</label>
                      <ul className="space-y-1">
                        {profile.nailHealth.goals.map((goal, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-charcoal"><span className="text-gold">→</span> {goal}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Allergies</label>
                      <ul className="space-y-1">
                        {profile.nailHealth.allergies.map((allergy, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-red-600"><span>⚠️</span> {allergy}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gold/10 to-amber-10 border border-gold/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-charcoal text-lg mb-1">Refer a Friend</h3>
                      <p className="text-charcoal/60 text-sm">Both get $20 off!</p>
                    </div>
                    <button onClick={() => setShowReferralModal(true)} className="px-4 py-2 bg-gold text-charcoal font-medium hover:bg-gold/90">Share Code</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-charcoal text-xl">Support</h2>
                  <button onClick={() => setShowSupportModal(true)} className="px-4 py-2 bg-gold text-charcoal font-medium hover:bg-gold/90">New Request</button>
                </div>

                <div className="space-y-4">
                  {supportData.map((ticket) => (
                    <div key={ticket.id} className="bg-white border border-charcoal/10 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs ${ticket.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {ticket.type === 'complaint' ? 'Complaint' : 'Suggestion'}
                          </span>
                          <span className="text-charcoal/50 text-sm">{new Date(ticket.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs ${ticket.status === 'resolved' ? 'bg-green-100 text-green-700' : ticket.status === 'implemented' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {ticket.status === 'resolved' ? 'Resolved' : ticket.status === 'implemented' ? 'Implemented' : 'Pending'}
                        </span>
                      </div>
                      <h4 className="font-medium text-charcoal mb-2">{ticket.subject}</h4>
                      <p className="text-charcoal/70 text-sm">{ticket.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showReferralModal && (
        <div className="fixed inset-0 bg-charcoal/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full p-6">
            <h3 className="font-heading text-charcoal text-xl mb-4">Refer a Friend</h3>
            <p className="text-charcoal/60 mb-4">Share your code - both get $20 off!</p>
            <div className="bg-offwhite p-4 text-center mb-4">
              <div className="text-sm text-charcoal/50 mb-1">Your Referral Code</div>
              <div className="text-3xl font-mono font-heading text-charcoal">{profile.referralCode}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopyCode} className="flex-1 py-3 border border-charcoal/20 text-charcoal hover:bg-charcoal/5">{copiedCode ? 'Copied!' : 'Copy Code'}</button>
              <button onClick={() => setShowReferralModal(false)} className="flex-1 py-3 bg-gold text-charcoal font-medium hover:bg-gold/90">Done</button>
            </div>
          </div>
        </div>
      )}

      {showSupportModal && (
        <div className="fixed inset-0 bg-charcoal/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full p-6">
            <h3 className="font-heading text-charcoal text-xl mb-4">Submit Request</h3>
            <form onSubmit={handleSupportSubmit}>
              <div className="mb-4">
                <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="type" value="suggestion" checked={supportForm.type === 'suggestion'} onChange={(e) => setSupportForm({...supportForm, type: e.target.value})} /><span className="text-charcoal">Suggestion</span></label>
                  <label className="flex items-center gap-2"><input type="radio" name="type" value="complaint" checked={supportForm.type === 'complaint'} onChange={(e) => setSupportForm({...supportForm, type: e.target.value})} /><span className="text-charcoal">Complaint</span></label>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Subject</label>
                <input type="text" value={supportForm.subject} onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})} className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none" placeholder="Brief subject..." />
              </div>
              <div className="mb-4">
                <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Message</label>
                <textarea value={supportForm.message} onChange={(e) => setSupportForm({...supportForm, message: e.target.value})} className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none h-32 resize-none" placeholder="Describe..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSupportModal(false)} className="flex-1 py-3 border border-charcoal/20 text-charcoal hover:bg-charcoal/5">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-gold text-charcoal font-medium hover:bg-gold/90">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}