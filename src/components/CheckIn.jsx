import { useState, useEffect } from 'react'
import { processCheckIn } from '../services/kioskService'
import { getServices } from '../services/services'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/servicesData'
import { getAvailableRefreshments, isRefreshmentAvailable } from '../services/inventoryService'
import RefreshmentSelect from './RefreshmentSelect'
import WaiverModal from './WaiverModal'

const Sparkle = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-gold rounded-full animate-ping"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${1 + Math.random()}s`
        }}
      />
    ))}
  </div>
)

const ServiceSelection = ({ onSelect, onBack, initialServices, initialAddOns }) => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshmentList, setRefreshmentList] = useState([])
  const [refreshmentsLoading, setRefreshmentsLoading] = useState(true)
  const [refreshmentPref, setRefreshmentPref] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [selectedServices, setSelectedServices] = useState(initialServices || [])
  const [selectedAddOns, setSelectedAddOns] = useState(initialAddOns || [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getServices(),
      getAvailableRefreshments(),
    ])
      .then(([svcData, refData]) => {
        setServices(svcData)
        setRefreshmentList(refData)
      })
      .catch((err) => { setError(err.message) })
      .finally(() => { setLoading(false); setRefreshmentsLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading services...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  const addOns = services.filter((s) => s.is_addon)
  const selectedAddOnDetails = addOns.filter((a) => selectedAddOns.includes(a.id))
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0) + selectedAddOnDetails.reduce((sum, a) => sum + (a.price || 0), 0)

  const groupedServices = services.reduce((acc, service) => {
    if (service.is_addon) return acc
    const category = service.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(service)
    return acc
  }, {})

  const allCategories = Object.keys(groupedServices).sort()
  const displayCategories = activeCategory === 'All'
    ? allCategories
    : allCategories.filter((c) => c === activeCategory)

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    )
  }

  const toggleAddOn = (id) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="w-full max-w-3xl">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-secondary hover:text-primary transition-colors z-10"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center mb-4">
          <h2 className="font-heading text-3xl text-gold mb-2">Select Your Services</h2>
          <p className="text-secondary">Choose one or more treatments</p>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x w-full px-1 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setExpandedCategory(null); }}
              className={`px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 snap-start ${
                activeCategory === cat
                  ? 'bg-gold text-charcoal'
                  : 'border border-theme text-secondary hover:border-theme hover:text-gold-strong'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {services.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted">No services available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayCategories.map((category) => {
              const isOpen = displayCategories.length === 1 || expandedCategory === category
              return (
                <div key={category} className="rounded-xl border border-card bg-secondary overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(isOpen ? null : category)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base text-gold">{category}</h3>
                      <span className="text-muted text-xs">({groupedServices[category].length})</span>
                    </div>
                    <svg className={`w-4 h-4 text-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupedServices[category].map((service) => {
                        const isSelected = selectedServices.some((s) => s.id === service.id)
                        return (
                          <button
                            key={service.id}
                            onClick={() => toggleService(service)}
                            className={`rounded-xl p-4 text-left border transition-all flex items-center gap-3 ${
                              isSelected ? 'border-2 border-theme' : 'border-light'
                            } bg-secondary`}
                          >
                            <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                              isSelected ? 'border-gold bg-gold' : 'border-light'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-heading text-base text-primary">{service.name}</div>
                              <div className="text-muted text-xs">{service.duration_minutes} min</div>
                            </div>
                            <div className="text-gold font-heading text-lg">${service.price}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedServices.length > 0 && (
          <div className="mt-4 rounded-xl border border-card bg-secondary p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-primary font-heading">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </div>
                <div className="text-secondary text-xs">
                  {selectedServices.map((s) => s.name).join(', ')}
                </div>
              </div>
              <div className="text-gold font-heading text-xl">${totalPrice.toFixed(2)}</div>
            </div>

            {addOns.length > 0 && (
              <div className="mb-3">
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Add-Ons (Optional)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {addOns.map((addOn) => (
                    <label
                      key={addOn.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedAddOns.includes(addOn.id) ? 'border-theme bg-card' : 'border-light hover:border-theme'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(addOn.id)}
                        onChange={() => toggleAddOn(addOn.id)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        selectedAddOns.includes(addOn.id) ? 'border-gold bg-gold' : 'border-light'
                      }`}>
                        {selectedAddOns.includes(addOn.id) && (
                          <svg className="w-2.5 h-2.5 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-primary font-heading text-sm">{addOn.name}</div>
                        <div className="text-muted text-xs">+{addOn.duration_minutes} min</div>
                      </div>
                      <div className="text-gold font-heading text-sm">+${addOn.price}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <RefreshmentSelect
              label="Refreshment"
              labelClassName="block text-secondary text-xs uppercase tracking-wider mb-2"
              value={refreshmentPref}
              onChange={(e) => setRefreshmentPref(e.target.value)}
              refreshments={refreshmentList}
              loading={refreshmentsLoading}
              emptyLabel="No refreshment"
              hideWhenEmpty
              className="px-3 py-2 text-sm"
            />

          </div>
        )}

        <p className="text-center text-muted text-sm mt-6">Times are approximate to ensure couture quality.</p>
        
        {selectedServices.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <button
              type="button"
              onClick={onBack}
              className="min-w-[120px] px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={() => {
                onSelect({ services: selectedServices, addOns: selectedAddOnDetails, refreshmentPref })
              }}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all"
            >
              CONFIRM
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const RegistrationModal = ({ phone, onClose, onCompleteWaiverTrigger }) => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [nailGoal, setNailGoal] = useState('')
  const [refreshmentList, setRefreshmentList] = useState([])
  const [refreshmentsLoading, setRefreshmentsLoading] = useState(true)
  const [refreshmentPref, setRefreshmentPref] = useState('')
  const [selectedServices, setSelectedServices] = useState([])
  const [showServiceSelection, setShowServiceSelection] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        window.location.href = '/check-in'
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    const fetchRefreshments = async () => {
      try {
        const data = await getAvailableRefreshments()
        setRefreshmentList(data)
      } catch (err) { console.error('Error fetching refreshments:', err) }
      finally { setRefreshmentsLoading(false) }
    }
    fetchRefreshments()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !nailGoal || selectedServices.length === 0) return
    
    setLoading(true)
    setError(null)
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, refreshmentList)
        ? (refreshmentPref || null)
        : null
      
       const { data: existingProfile, error: profileSearchError } = await supabase
         .from('profiles')
         .select('*')
         .eq('phone', cleanPhone)
         .single()
      
      let profileId
      let finalProfile
      
      if (profileSearchError && profileSearchError.code !== 'PGRST116') {
        throw profileSearchError
      }
      
      if (existingProfile) {
        profileId = existingProfile.id
        finalProfile = existingProfile
      } else {
         const { data: profile, error: insertError } = await supabase
           .from('profiles')
           .insert({
             full_name: fullName,
             email: email,
             phone: cleanPhone,
             nail_goal: nailGoal,
             refreshment_pref: safeRefreshmentPref
           })
           .select()
           .single()

        if (insertError) {
          console.error('Profile insert error:', insertError)
          throw insertError
        }
        profileId = profile.id
        finalProfile = profile
      }

      const allNames = selectedServices.map((s) => s.name).join(', ')
      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0)
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: profileId,
          service_id: selectedServices[0]?.id || null,
          add_ons: allNames || null,
          final_price: totalPrice,
          status: 'waiting',
          checked_in_at: new Date().toISOString(),
          refreshment_pref: safeRefreshmentPref,
          booking_type: 'walk_in',
        })

      if (appointmentError) {
        console.error('Appointment insert error:', appointmentError)
        throw appointmentError
      }

      // Capture details for the waiver before completing the appointment block
      // Pass the newly created profile data back up to the parent component to trigger the waiver
      onCompleteWaiverTrigger({
        id: profileId,
        full_name: finalProfile.full_name,
        phone: finalProfile.phone,
        refreshmentPref: safeRefreshmentPref
      });
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-8 relative overflow-hidden animate-fade-in">
        <Sparkle />
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="font-heading text-4xl text-gold mb-4 tracking-wide">Welcome to the Club</h2>
          <p className="font-heading text-2xl text-primary mb-6">{fullName}</p>
          {refreshmentPref && (
            <p className="text-xl text-secondary">
              Your <span className="text-gold">{refreshmentPref}</span> is being prepared
            </p>
          )}
          <div className="mt-8 animate-fade-in">
            <button
              onClick={() => { window.location.href = '/' }}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all"
            >
              RETURN HOME
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showServiceSelection) {
    return (
      <ServiceSelection 
        onSelect={(payload) => {
          setSelectedServices(payload.services || [])
          setShowServiceSelection(false)
        }}
        onBack={() => setShowServiceSelection(false)}
      />
    )
  }

  return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-8 animate-fade-in">
        <div className="w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-secondary hover:text-primary transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="font-heading text-3xl text-gold mb-2">Join the Couture Club</h2>
          <p className="text-secondary">Create your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-secondary text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-input text-primary placeholder-text-muted rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-secondary text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-input text-primary placeholder-text-muted rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-secondary text-sm mb-2">Nail Goal</label>
            <select
              value={nailGoal}
              onChange={(e) => setNailGoal(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-input text-primary rounded-lg focus:outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
              required
            >
              <option value="" className="bg-primary">Select your nail goal</option>
              <option value="Healthy Natural Nails" className="bg-primary">Healthy Natural Nails</option>
              <option value="Long Extensions" className="bg-primary">Long Extensions</option>
              <option value="Intricate Art" className="bg-primary">Intricate Art</option>
            </select>
          </div>

          <RefreshmentSelect
            label="Refreshment Preference"
            labelClassName="block text-secondary text-sm mb-2"
            value={refreshmentPref}
            onChange={(e) => setRefreshmentPref(e.target.value)}
            refreshments={refreshmentList}
            loading={refreshmentsLoading}
            emptyLabel="Select a refreshment (optional)"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="bg-secondary border border-theme rounded-xl p-4">
            <label className="block text-secondary text-sm mb-2">Selected Services</label>
            {selectedServices.length > 0 ? (
              <div>
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-primary font-heading">{s.name}</div>
                      <div className="text-gold text-sm">${s.price}</div>
                    </div>
                  </div>
                ))}
                <div className="text-gold font-heading text-lg mt-1">
                  Total: ${selectedServices.reduce((sum, s) => sum + (s.price || 0), 0).toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => setShowServiceSelection(true)}
                  className="text-gold text-sm hover:underline mt-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowServiceSelection(true)}
                className="w-full py-3 border border-theme text-gold-strong hover:bg-card rounded-lg transition-all"
              >
                Select Services
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-w-[120px] px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading || !fullName || !email || !nailGoal || selectedServices.length === 0}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'CREATING...' : 'JOIN CLUB'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'clear']
]

export default function CheckIn({ onNavigate }) {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showServiceSelection, setShowServiceSelection] = useState(false)
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [services, setServices] = useState([])
  // Waiver modal state
  const [showWaiver, setShowWaiver] = useState(false)
  const [waiverCustomerName, setWaiverCustomerName] = useState('')
  const [waiverCustomerPhone, setWaiverCustomerPhone] = useState('')
  // Post-waiver success for new users
  const [newUserSuccess, setNewUserSuccess] = useState(false)
  const [newUserDetails, setNewUserDetails] = useState({
    fullName: '',
    refreshmentPref: ''
  })

  useEffect(() => {
    getServices().then(setServices).catch(() => {})
  }, [])

  useEffect(() => {
    if (!newUserSuccess) return
    const timer = setTimeout(() => {
      setNewUserSuccess(false)
      setPhone('')
      setResult(null)
      setSelectedServices([])
      setSelectedAddOns([])
      setShowServiceSelection(false)
    }, 7000)
    return () => clearTimeout(timer)
  }, [newUserSuccess])

  const handleKeyPress = (key) => {
    if (key === 'del') {
      setPhone(prev => prev.slice(0, -1))
      setResult(null)
    } else if (key === 'clear') {
      setPhone('')
      setResult(null)
    } else if (key && phone.length < 10) {
      setPhone(prev => prev + key)
    }
  }

  const handleSubmit = async () => {
    if (phone.length !== 10) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await processCheckIn(phone)
      setResult(response)
      
      // Set up the waiver modal data
      const cleanPhone = phone.replace(/\D/g, '')
      setWaiverCustomerPhone(cleanPhone)
      
      if (response.isNew) {
        // New user: Do NOT show waiver yet. Let them register their profile first!
        setShowWaiver(false)
      } else {
        // Existing user: They have a profile, go straight to waiver
        setWaiverCustomerName(response.name || '')
        setShowWaiver(true)
      }
    } catch (err) {
      console.error('Check-in error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  
  // New function to trigger waiver after registration
  const handleCompleteWaiverTrigger = (profileData) => {
    // Update result to include the new profile
    setResult(prev => ({
      ...prev,
      profile: profileData,
      name: profileData.full_name
    }))
    // Set waiver details
    setWaiverCustomerName(profileData.full_name)
    setWaiverCustomerPhone(profileData.phone)
    // Set new user success details
    setNewUserDetails({
      fullName: profileData.full_name,
      refreshmentPref: profileData.refreshmentPref || ''
    })
    // Show the waiver modal
    setShowWaiver(true)
  }

  const handleExistingUserServiceSelect = async (payload) => {
    const { services, addOns, refreshmentPref } = payload
    if (!result?.appointment?.id) return
    setLoading(true)
    try {
      const allNames = [...addOns.map((a) => a.name), ...services.map((s) => s.name)].join(', ')
      const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0) + addOns.reduce((sum, a) => sum + (a.price || 0), 0)
      const availableRefreshments = await getAvailableRefreshments()
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, availableRefreshments)
        ? (refreshmentPref || null)
        : null
      await supabase.from('appointments').update({
        service_id: services[0]?.id || null,
        add_ons: allNames || null,
        final_price: totalPrice,
        refreshment_pref: safeRefreshmentPref
      }).eq('id', result.appointment.id)
      setSelectedServices(services)
      setSelectedAddOns(addOns)
      setShowServiceSelection(false)
    } catch { }
    setLoading(false)
  }

  const handleNewUserServiceSelect = (payload) => {
    const { services, addOns } = payload
    setSelectedServices(services)
    setSelectedAddOns(addOns)
    setShowServiceSelection(false)
  }

  // Handle saving the waiver to the database safely 
  const handleSaveWaiver = async (waiverData) => { 
    setLoading(true) 
    setError(null) 
    try { 
      // Safely parse out the profile details returned from processCheckIn 
      const profileId = result?.profile?.id || result?.appointment?.customer_id || null; 
      const profileName = result?.profile?.full_name || result?.name || waiverCustomerName || 'Walk-In Customer'; 
      const profilePhone = result?.profile?.phone || waiverCustomerPhone; 

      const payload = { 
        profile_id: profileId, 
        customer_phone: profilePhone, 
        customer_name: profileName, 
        agreed_to_terms: true, 
        signature_image: waiverData.signature_image 
      }; 
      
      console.log("Submitting Waiver Payload:", payload); 

      // Save the waiver to the database 
      const { error: insertError } = await supabase 
        .from('customer_waivers') 
        .insert([payload]) 

      if (insertError) { 
        console.error("Waiver DB Save Error:", insertError); 
        throw insertError; 
      } 

      console.log("Waiver successfully attached to Profile ID:", profileId); 
      
      // Show success screen first, then hide waiver — prevents intermediate RegistrationModal re-mount
      if (result?.isNew) {
        setNewUserSuccess(true)
      }
      setShowWaiver(false)
      
    } catch (err) { 
      console.error('Error saving waiver:', err) 
      setError('Failed to save waiver securely. Please try again.') 
    } finally { 
      setLoading(false) 
    } 
  }

  const formatDisplay = (num) => {
    if (num.length === 0) return 'Enter phone number'
    if (num.length <= 3) return `(${num}) `
    if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`
    return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`
  }

  // Show waiver modal first if needed
  if (showWaiver) {
    return (
      <WaiverModal
        customerName={waiverCustomerName}
        customerPhone={waiverCustomerPhone}
        onConfirm={handleSaveWaiver}
        onCancel={() => {
          // Reset everything when canceling
          setShowWaiver(false)
          setLoading(false)
          setPhone('')
          setResult(null)
          setError(null)
          setSelectedServices([])
          setSelectedAddOns([])
          onNavigate('home') // Go back home
        }}
      />
    )
  }

  // Show new user success after waiver
  if (newUserSuccess) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-8 relative overflow-hidden animate-fade-in">
        <Sparkle />
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="font-heading text-4xl text-gold mb-4 tracking-wide">Welcome to the Club</h2>
          <p className="font-heading text-2xl text-primary mb-6">{newUserDetails.fullName}</p>
          {newUserDetails.refreshmentPref && (
            <p className="text-xl text-secondary">
              Your <span className="text-gold">{newUserDetails.refreshmentPref}</span> is being prepared
            </p>
          )}
          <div className="mt-8 animate-fade-in">
            <button
              onClick={() => {
                setNewUserSuccess(false)
                setPhone('')
                setResult(null)
                setSelectedServices([])
                setSelectedAddOns([])
                setShowServiceSelection(false)
                navigate('/')
              }}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all"
            >
              RETURN HOME
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showServiceSelection) {
    return (
      <ServiceSelection
        onSelect={(payload) => {
          if (result && !result.isNew && result.appointment) {
            handleExistingUserServiceSelect(payload)
          } else {
            handleNewUserServiceSelect(payload)
          }
        }}
        onBack={() => setShowServiceSelection(false)}
        initialServices={selectedServices}
        initialAddOns={selectedAddOns.map((a) => a.id)}
      />
    )
  }

  if (result && !result.isNew && result.appointment) {
    const addOns = services.filter((s) => s.is_addon)
    const selectedAddOnDetails = selectedAddOns
    const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0) + selectedAddOnDetails.reduce((sum, a) => sum + (a.price || 0), 0)

    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in">
        <div className="text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-heading text-3xl text-primary mb-2">Welcome Back</h2>
          <p className="text-xl text-gold mb-6">{result.name}</p>

          <button
            onClick={() => setShowServiceSelection(true)}
            className="w-full py-3 border border-theme text-gold-strong hover:bg-card rounded-xl transition-all mb-6"
          >
            {selectedServices.length > 0 ? 'Change Services' : 'Select Services'}
          </button>

          {selectedServices.length > 0 && (
            <div className="bg-secondary border border-theme rounded-xl p-4 mb-6">
              <p className="text-secondary text-sm mb-2">Selected:</p>
              {selectedServices.map((s) => (
                <p key={s.id} className="text-primary font-heading text-base">{s.name} — ${s.price}</p>
              ))}
              {selectedAddOnDetails.length > 0 && (
                <p className="text-secondary text-sm mt-1">Add-ons: + {selectedAddOnDetails.map((a) => a.name).join(', ')}</p>
              )}
              <div className="text-gold font-heading text-2xl mt-2">${totalPrice.toFixed(2)}</div>
            </div>
          )}

          {addOns.length > 0 && selectedServices.length > 0 && (
            <div className="mb-6">
              <p className="text-secondary text-sm mb-3">Add-Ons (Optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {addOns.map((addOn) => {
                  const isSelected = selectedAddOns.some((a) => a.id === addOn.id)
                  return (
                    <button
                      key={addOn.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedAddOns((prev) => prev.filter((a) => a.id !== addOn.id))
                        } else {
                          setSelectedAddOns((prev) => [...prev, addOn])
                        }
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        isSelected ? 'border-theme bg-card' : 'border-light hover:border-theme'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-gold bg-gold' : 'border-light'
                      }`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-primary font-heading text-sm">{addOn.name}</div>
                        <div className="text-muted text-xs">+{addOn.duration_minutes} min</div>
                      </div>
                      <div className="text-gold font-heading text-sm">+${addOn.price}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {addOns.length === 0 && selectedServices.length > 0 && (
            <div className="mb-6 text-muted text-sm">No add-ons available</div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setPhone(''); setResult(null); setSelectedServices([]); setSelectedAddOns([]); setShowServiceSelection(false); onNavigate('home')
              }}
              className="min-w-[120px] px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={() => {
                setNewUserDetails({
                  fullName: result?.name || 'Guest',
                  refreshmentPref: result?.appointment?.refreshment_pref || ''
                })
                setNewUserSuccess(true)
              }}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all"
            >
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (result && result.isNew) {
    return (
      <RegistrationModal 
        phone={phone} 
        onClose={() => {
          setPhone('')
          setResult(null)
        }}
        onCompleteWaiverTrigger={handleCompleteWaiverTrigger}
      />
    )
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col animate-fade-in">
      <div className="p-6">
        <button
          onClick={() => onNavigate('home')}
          className="text-secondary hover:text-primary transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="font-heading text-3xl text-gold mb-2 tracking-wide">CHECK IN</h1>
        <p className="text-secondary mb-8">Enter your phone number to begin</p>

        <div className="w-full max-w-sm mb-8">
          <div className={`text-center text-3xl font-heading py-4 transition-all ${
            phone.length > 0 ? 'text-primary' : 'text-muted'
          }`}>
            {formatDisplay(phone)}
          </div>
          <div className="h-1 bg-secondary mx-auto w-48 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${(phone.length / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="w-full max-w-xs">
          {keys.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-3 mb-3">
              {row.map((key, keyIndex) => (
                <button
                  key={keyIndex}
                  onClick={() => handleKeyPress(key)}
                  disabled={loading || (key === '' && keyIndex !== 1)}
                  className={`
                    w-20 h-20 rounded-full text-2xl font-heading transition-all
                    ${key === 'del' 
                      ? 'bg-input text-primary hover:bg-card' 
                      : key === 'clear'
                        ? 'bg-input text-primary hover:bg-card text-xs tracking-[0.24em] uppercase'
                        : key === '' 
                          ? 'bg-transparent cursor-default'
                          : phone.length >= 10
                            ? 'bg-secondary text-muted cursor-not-allowed'
                            : 'bg-input text-primary hover:bg-gold/20 hover:text-gold'
                    }
                  `}
                >
                  {key === 'del' ? (
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 4l18 16" />
                    </svg>
                  ) : key === 'clear' ? 'CLEAR' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {phone.length === 10 && !loading && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setPhone('')
                setResult(null)
                setError(null)
                onNavigate('home')
              }}
              className="min-w-[120px] px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all"
            >
              CHECK IN
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-6 text-gold animate-pulse">Processing...</div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-center max-w-xs">{error}</div>
        )}
      </div>
    </div>
  )
}