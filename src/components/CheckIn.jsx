import { useState, useEffect } from 'react'
import { processCheckIn } from '../services/kioskService'
import { getServices } from '../services/services'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

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

const ServiceSelection = ({ onSelect, onBack }) => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getServices()
      .then((data) => {
        console.log('Services loaded:', data)
        setServices(data)
      })
      .catch((err) => {
        console.error('Failed to load services:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal/95 flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading services...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-charcoal/95 flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(service)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-charcoal/95 flex items-center justify-center p-8">
      <div className="w-full max-w-3xl animate-fade-in">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-offwhite/50 hover:text-offwhite transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl text-gold mb-2">Select Your Service</h2>
          <p className="text-offwhite/60">Choose your treatment</p>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-offwhite/40">No services available</p>
          </div>
        ) : (
          <>
            <div className="space-y-8">
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category}>
                  <h3 className="font-heading text-lg text-gold mb-3 border-b border-gold/20 pb-2">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categoryServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          console.log('Selected service:', service)
                          onSelect(service)
                        }}
                        className="bg-offwhite/5 border border-gold/30 hover:border-gold hover:bg-gold/10 rounded-xl p-5 text-left transition-all group"
                      >
                        <div className="font-heading text-lg text-offwhite group-hover:text-gold mb-1">
                          {service.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gold text-xl font-heading">${service.price}</span>
                          <span className="text-offwhite/50 text-sm">{service.duration_minutes} min</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-offwhite/30 text-sm mt-6">Times are approximate to ensure couture quality.</p>
          </>
        )}
      </div>
    </div>
  )
}

const RegistrationModal = ({ phone, onClose, onComplete }) => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [nailGoal, setNailGoal] = useState('')
  const [refreshmentPref, setRefreshmentPref] = useState('')
  const [selectedService, setSelectedService] = useState(null)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !nailGoal || !selectedService) return
    
    setLoading(true)
    setError(null)
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      
      const { data: profile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          full_name: fullName,
          email: email,
          phone_number: cleanPhone,
          nail_goal: nailGoal,
          refreshment_pref: refreshmentPref || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (profile) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            profile_id: profile.id,
            service_id: selectedService.id,
            status: 'Checked-In',
            check_in_time: new Date().toISOString(),
            refreshment_choice: refreshmentPref || null
          })

        if (appointmentError) throw appointmentError
      }

      setSuccess(true)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-8 relative overflow-hidden">
        <Sparkle />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="font-heading text-4xl text-gold mb-4 tracking-wide">Welcome to the Club</h2>
          <p className="font-heading text-2xl text-offwhite mb-6">{fullName}</p>
          {refreshmentPref && (
            <p className="text-xl text-offwhite/70">
              Your <span className="text-gold">{refreshmentPref}</span> is being prepared
            </p>
          )}
        </div>
      </div>
    )
  }

  if (showServiceSelection) {
    return (
      <ServiceSelection 
        onSelect={(service) => {
          setSelectedService(service)
          setShowServiceSelection(false)
        }}
        onBack={() => setShowServiceSelection(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-charcoal/95 flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-offwhite/50 hover:text-offwhite transition-colors"
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
          <p className="text-offwhite/60">Create your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite placeholder-offwhite/30 rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite placeholder-offwhite/30 rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Nail Goal</label>
            <select
              value={nailGoal}
              onChange={(e) => setNailGoal(e.target.value)}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg focus:outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
              required
            >
              <option value="" className="bg-charcoal">Select your nail goal</option>
              <option value="Healthy Natural Nails" className="bg-charcoal">Healthy Natural Nails</option>
              <option value="Long Extensions" className="bg-charcoal">Long Extensions</option>
              <option value="Intricate Art" className="bg-charcoal">Intricate Art</option>
            </select>
          </div>

          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Refreshment Preference</label>
            <select
              value={refreshmentPref}
              onChange={(e) => setRefreshmentPref(e.target.value)}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg focus:outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-charcoal">Select a refreshment (optional)</option>
              <option value="Coffee" className="bg-charcoal">Coffee</option>
              <option value="Tea" className="bg-charcoal">Tea</option>
              <option value="Sparkling Water" className="bg-charcoal">Sparkling Water</option>
              <option value="Still Water" className="bg-charcoal">Still Water</option>
              <option value="Wine" className="bg-charcoal">Wine</option>
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="bg-offwhite/5 border border-gold/30 rounded-xl p-4">
            <label className="block text-offwhite/80 text-sm mb-2">Selected Service</label>
            {selectedService ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-offwhite font-heading">{selectedService.name}</div>
                  <div className="text-gold text-sm">${selectedService.price}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServiceSelection(true)}
                  className="text-gold text-sm hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowServiceSelection(true)}
                className="w-full py-3 border border-gold/50 text-gold hover:bg-gold/10 rounded-lg transition-all"
              >
                Select a Service
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !fullName || !email || !nailGoal || !selectedService}
            className="w-full py-4 bg-gold text-charcoal font-heading text-lg tracking-wider hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Profile...' : 'Join the Club'}
          </button>
        </form>
      </div>
    </div>
  )
}

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', '']
]

export default function CheckIn({ onNavigate }) {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showServiceSelection, setShowServiceSelection] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [services, setServices] = useState([])

  useEffect(() => {
    getServices().then(setServices).catch(console.error)
  }, [])

  const handleKeyPress = (key) => {
    if (key === 'del') {
      setPhone(prev => prev.slice(0, -1))
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
    } catch (err) {
      console.error('Check-in error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleExistingUserServiceSelect = async (service) => {
    if (!result?.appointment?.id) return
    
    setLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ service_id: service.id })
        .eq('id', result.appointment.id)

      if (updateError) throw updateError
      
      setSelectedService(service)
      setShowServiceSelection(false)
    } catch (err) {
      console.error('Error updating service:', err)
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

  if (showServiceSelection) {
    return (
      <ServiceSelection 
        onSelect={(service) => {
          if (result && !result.isNew && result.appointment) {
            handleExistingUserServiceSelect(service)
          } else {
            setSelectedService(service)
            setShowServiceSelection(false)
          }
        }}
        onBack={() => setShowServiceSelection(false)}
      />
    )
  }

  if (result && !result.isNew && result.appointment) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-8">
        <div className="text-center animate-fade-in max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-heading text-3xl text-offwhite mb-2">Welcome Back</h2>
          <p className="text-xl text-gold mb-8">{result.name}</p>
          
          <div className="mb-6">
            <p className="text-offwhite/60 mb-3">Select your service:</p>
            <div className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleExistingUserServiceSelect(service)}
                  className="bg-offwhite/10 border border-gold/30 hover:border-gold rounded-xl p-4 text-left"
                >
                  <div className="text-offwhite font-heading text-sm">{service.name}</div>
                  <div className="text-gold">${service.price}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedService && (
            <div className="bg-gold/20 border border-gold/50 rounded-xl p-4 mb-6">
              <p className="text-offwhite/60 text-sm">Selected:</p>
              <p className="text-gold font-heading">{selectedService.name} - ${selectedService.price}</p>
            </div>
          )}

          <p className="text-offwhite/60 mb-8">You have been checked in</p>
          <button
            onClick={() => {
              setPhone('')
              setResult(null)
              setSelectedService(null)
            }}
            className="px-8 py-3 border-2 border-gold text-gold hover:bg-gold hover:text-charcoal transition-all"
          >
            CHECK IN ANOTHER GUEST
          </button>
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
        onComplete={() => {
          navigate('/')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      <div className="p-6">
        <button
          onClick={() => onNavigate('home')}
          className="text-offwhite/50 hover:text-offwhite transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="font-heading text-3xl text-gold mb-2 tracking-wide">CHECK IN</h1>
        <p className="text-offwhite/50 mb-8">Enter your phone number to begin</p>

        <div className="w-full max-w-sm mb-8">
          <div className={`text-center text-3xl font-heading py-4 transition-all ${
            phone.length > 0 ? 'text-offwhite' : 'text-offwhite/30'
          }`}>
            {formatDisplay(phone)}
          </div>
          <div className="h-1 bg-offwhite/10 mx-auto w-48 rounded-full overflow-hidden">
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
                      ? 'bg-offwhite/10 text-offwhite hover:bg-offwhite/20' 
                      : key === '' 
                        ? 'bg-transparent cursor-default'
                        : phone.length >= 10
                          ? 'bg-offwhite/5 text-offwhite/20 cursor-not-allowed'
                          : 'bg-offwhite/10 text-offwhite hover:bg-gold/20 hover:text-gold'
                    }
                  `}
                >
                  {key === 'del' ? (
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 4l18 16" />
                    </svg>
                  ) : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {phone.length === 10 && !loading && (
          <button
            onClick={handleSubmit}
            className="mt-6 px-12 py-4 bg-gold text-charcoal text-lg font-heading tracking-wider hover:bg-gold/90 transition-all animate-fade-in"
          >
            CHECK IN
          </button>
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