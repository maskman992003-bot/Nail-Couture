import { useState, useEffect } from 'react'
import { processCheckIn, completeCheckIn } from '@nail-couture/shared/services/kioskService'
import { getServices } from '@nail-couture/shared/services/services'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CHECK_IN_ROLE } from '@nail-couture/shared/utils/routes'
import { isKioskPhone, verifyKioskPin, normalizePhone } from '@nail-couture/shared/constants/kiosk'
import KioskPinKeypad from './KioskPinKeypad'
import { getAvailableRefreshments, isRefreshmentAvailable } from '@nail-couture/shared/services/inventoryService'
import { buildAppointmentServicePayload } from '@nail-couture/shared/utils/appointmentServices'
import { LOYALTY_REWARDS, reserveLoyaltyRewardForVisit } from '@nail-couture/shared/utils/loyaltyTransactions'
import RefreshmentSelect from './RefreshmentSelect'
import WaiverModal from './WaiverModal'
import ScrollSelect from './ScrollSelect'
import ServiceSelection from './ServiceSelection'
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh'
import {
  completeCustomerRegistration,
  generateCustomerReferralCode,
  isRegistrationComplete,
  updateKioskAppointmentServices,
} from '@nail-couture/shared/auth/registration.js'

const MONTHS = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1).padStart(2, '0'),
}));

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

const RegistrationModal = ({ phone, existingProfile, existingAppointmentId, onClose, onCompleteWaiverTrigger }) => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(existingProfile?.full_name || '')
  const [email, setEmail] = useState(existingProfile?.email || '')
  const [nailGoal, setNailGoal] = useState(existingProfile?.nail_goal || '')
  const [birthdayMonth, setBirthdayMonth] = useState((existingProfile?.birthday || '').split('-')[0] || '')
  const [birthdayDay, setBirthdayDay] = useState((existingProfile?.birthday || '').split('-')[1] || '')
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
    if (!fullName || !email || !nailGoal || !birthdayMonth || !birthdayDay || selectedServices.length === 0) return
    
    setLoading(true)
    setError(null)
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, refreshmentList)
        ? (refreshmentPref || null)
        : null
      
       const { data: profileRows, error: profileSearchError } = await supabase
         .from('profiles')
         .select('*')
         .or(`phone.eq.${cleanPhone},phone.eq.${phone}`)
         .order('created_at', { ascending: true })
         .limit(1)
      
       let profileId
      let finalProfile
      const foundProfile = profileRows?.[0] || null
      
      if (profileSearchError) {
        throw profileSearchError
      }
      
      if (foundProfile) {
        if (!isRegistrationComplete(foundProfile)) {
          const birthday = birthdayMonth && birthdayDay ? `${birthdayMonth}-${birthdayDay}` : null
          const updatedProfile = await completeCustomerRegistration(supabase, cleanPhone, {
            fullName,
            email,
            nailGoal,
            refreshmentPref: safeRefreshmentPref,
            birthday,
            referralCode: foundProfile.referral_code || generateCustomerReferralCode(fullName),
          })

          profileId = updatedProfile.id
          finalProfile = updatedProfile
        } else {
          profileId = foundProfile.id
          finalProfile = foundProfile
        }
      } else {
         const birthday = birthdayMonth && birthdayDay ? `${birthdayMonth}-${birthdayDay}` : null
         const { data: profile, error: insertError } = await supabase
           .from('profiles')
           .insert({
             full_name: fullName,
             email: email,
             phone: cleanPhone,
             nail_goal: nailGoal,
             refreshment_pref: safeRefreshmentPref,
             birthday,
             registration_complete: true,
             referral_code: generateCustomerReferralCode(fullName),
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

      const { add_ons: addOnsValue, selected_service_names: selectedServiceNames } = buildAppointmentServicePayload(selectedServices, [])
      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0)

      let appointment
      if (existingAppointmentId) {
        appointment = await updateKioskAppointmentServices(supabase, cleanPhone, existingAppointmentId, {
          serviceId: selectedServices[0]?.id || null,
          addOns: addOnsValue,
          selectedServiceNames,
          finalPrice: totalPrice,
          refreshmentPref: safeRefreshmentPref,
        })
      } else {
        const { data: createdAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            customer_id: profileId,
            service_id: selectedServices[0]?.id || null,
            add_ons: addOnsValue,
            selected_service_names: selectedServiceNames,
            final_price: totalPrice,
            status: 'checking_in',
            refreshment_pref: safeRefreshmentPref,
            booking_type: 'walk_in',
          })
          .select()
          .single()

        if (appointmentError) {
          console.error('Appointment insert error:', appointmentError)
          throw appointmentError
        }
        appointment = createdAppointment
      }

      // Capture details for the waiver before completing the appointment block
      // Pass the newly created profile data back up to the parent component to trigger the waiver
      onCompleteWaiverTrigger({
        id: profileId,
        full_name: finalProfile.full_name,
        phone: finalProfile.phone,
        refreshmentPref: safeRefreshmentPref,
        appointmentId: appointment.id,
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
          <h2 className="font-heading text-3xl text-gold mb-2">
            {existingProfile && !isRegistrationComplete(existingProfile) ? 'Complete Your Profile' : 'Join the Couture Club'}
          </h2>
          <p className="text-secondary">
            {existingProfile && !isRegistrationComplete(existingProfile)
              ? 'Finish setting up your account to continue check-in'
              : 'Create your profile to get started'}
          </p>
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

          <div>
            <label className="block text-secondary text-sm mb-2">Birthday</label>
            <div className="flex gap-3">
              <ScrollSelect
                value={birthdayMonth}
                onChange={setBirthdayMonth}
                options={MONTHS}
                placeholder="Month"
                className="flex-1"
              />
              <ScrollSelect
                value={birthdayDay}
                onChange={setBirthdayDay}
                options={DAYS}
                placeholder="Day"
                className="flex-1"
              />
            </div>
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
              disabled={loading || !fullName || !email || !nailGoal || !birthdayMonth || !birthdayDay || selectedServices.length === 0}
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
  const { logout } = useAuth()
  const [phone, setPhone] = useState('')
  const [kioskExitStep, setKioskExitStep] = useState('phone')
  const [kioskProfile, setKioskProfile] = useState(null)
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
  const [customerPoints, setCustomerPoints] = useState(0)
  const [reservedReward, setReservedReward] = useState(null)
  const [rewardError, setRewardError] = useState('')
  const [rewardSaving, setRewardSaving] = useState(false)
  const [refreshmentList, setRefreshmentList] = useState([])
  const [refreshmentsLoading, setRefreshmentsLoading] = useState(false)
  const [refreshmentPref, setRefreshmentPref] = useState('')

  useEffect(() => {
    getServices().then(setServices).catch(() => {})
  }, [])

  useRegisterPullToRefresh(async () => {
    const [svcData, refreshmentData] = await Promise.all([
      getServices().catch(() => []),
      getAvailableRefreshments().catch(() => []),
    ])
    setServices(svcData || [])
    setRefreshmentList(refreshmentData || [])
  })

  useEffect(() => {
    if (!result || result.isNew || result.needsRegistration || !result.appointment) return
    setRefreshmentsLoading(true)
    getAvailableRefreshments()
      .then(setRefreshmentList)
      .catch(() => {})
      .finally(() => setRefreshmentsLoading(false))
    const pref = result.appointment?.refreshment_pref || result.profile?.refreshment_pref || ''
    setRefreshmentPref(pref || '')
  }, [result?.appointment?.id, result?.profile?.id, result?.isNew, result?.needsRegistration])

  useEffect(() => {
    if (!result?.profile?.id && !result?.appointment?.customer_id) return
    const profileId = result.profile?.id || result.appointment?.customer_id
    supabase.from('profiles').select('loyalty_points').eq('id', profileId).maybeSingle()
      .then(({ data }) => setCustomerPoints(data?.loyalty_points || 0))
      .catch(() => setCustomerPoints(0))
  }, [result?.profile?.id, result?.appointment?.customer_id])

  useEffect(() => {
    const appointment = result?.appointment
    if (appointment?.loyalty_reward_id) {
      setReservedReward({
        id: appointment.loyalty_reward_id,
        name: appointment.loyalty_reward_name,
        points: appointment.loyalty_points_cost,
        code: appointment.loyalty_redemption_code,
      })
    } else {
      setReservedReward(null)
    }
  }, [result?.appointment?.id, result?.appointment?.loyalty_reward_id])

  const handleReserveReward = async (reward) => {
    if (!result?.appointment?.id || rewardSaving) return
    setRewardSaving(true)
    setRewardError('')
    const reserveResult = await reserveLoyaltyRewardForVisit(phone, result.appointment.id, reward)
    setRewardSaving(false)
    if (!reserveResult.success) {
      setRewardError(reserveResult.error || 'Could not reserve reward')
      return
    }
    setReservedReward({
      id: reward.id,
      name: reward.name,
      points: reward.points,
      code: reserveResult.redemption_code,
    })
    setResult((prev) => ({
      ...prev,
      appointment: {
        ...prev.appointment,
        loyalty_reward_id: reward.id,
        loyalty_reward_name: reward.name,
        loyalty_points_cost: reward.points,
        loyalty_redemption_code: reserveResult.redemption_code,
        loyalty_discount_amount: reward.discountAmount || 0,
      },
    }))
  }

  useEffect(() => {
    if (!newUserSuccess) return
    const timer = setTimeout(() => {
      setNewUserSuccess(false)
      setPhone('')
      setResult(null)
      setSelectedServices([])
      setSelectedAddOns([])
      setRefreshmentPref('')
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
      if (isKioskPhone(phone)) {
        const cleanPhone = normalizePhone(phone)
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, pin, role, full_name, phone')
          .eq('phone', cleanPhone)
          .eq('role', CHECK_IN_ROLE)
          .maybeSingle()

        if (profileError) throw profileError
        if (!data) {
          setError('Kiosk account not configured')
          return
        }

        setKioskProfile(data)
        setKioskExitStep('pin')
        return
      }

      const response = await processCheckIn(phone)
      setResult(response)
      
      // Set up the waiver modal data
      const cleanPhone = phone.replace(/\D/g, '')
      setWaiverCustomerPhone(cleanPhone)
      
      if (response.isNew || response.needsRegistration) {
        // New or incomplete profile: complete registration before waiver
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
      needsRegistration: false,
      registrationCompleted: true,
      profile: profileData,
      name: profileData.full_name,
      appointment: profileData.appointmentId
        ? { id: profileData.appointmentId, customer_id: profileData.id }
        : prev?.appointment,
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
      const { add_ons: addOnsValue, selected_service_names: selectedServiceNames } = buildAppointmentServicePayload(services, addOns)
      const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0) + addOns.reduce((sum, a) => sum + (a.price || 0), 0)
      const availableRefreshments = await getAvailableRefreshments()
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, availableRefreshments)
        ? (refreshmentPref || null)
        : null
      const { error: updateError } = await supabase.rpc('update_my_appointment', {
        caller_phone: getCallerPhoneForAppointmentRpc(),
        appointment_id: result.appointment.id,
        p_service_id: services[0]?.id || null,
        p_add_ons: addOnsValue,
        p_selected_service_names: selectedServiceNames,
        p_final_price: totalPrice,
        p_refreshment_pref: safeRefreshmentPref,
      })
      if (updateError) throw updateError
      setSelectedServices(services)
      setSelectedAddOns(addOns)
      setShowServiceSelection(false)
    } catch (err) {
      setError(err.message || 'Failed to save services')
    }
    setLoading(false)
  }

  const handleNewUserServiceSelect = (payload) => {
    const { services, addOns } = payload
    setSelectedServices(services)
    setSelectedAddOns(addOns)
    setShowServiceSelection(false)
  }

  const getCallerPhoneForAppointmentRpc = () => {
    const fromProfile = result?.profile?.phone
    if (fromProfile) return fromProfile
    return phone.replace(/\D/g, '')
  }

  const resetCheckInFlow = () => {
    setPhone('')
    setResult(null)
    setSelectedServices([])
    setSelectedAddOns([])
    setRefreshmentPref('')
    setShowServiceSelection(false)
    setError(null)
  }

  const exitCheckIn = () => {
    resetCheckInFlow()
    if (onNavigate) onNavigate('home')
    else navigate('/')
  }

  const handleConfirmExistingUserCheckIn = async () => {
    const appointmentId = result?.appointment?.id
    if (!appointmentId) {
      setError('No active appointment found. Please check in again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const availableRefreshments = await getAvailableRefreshments()
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, availableRefreshments)
        ? (refreshmentPref || null)
        : null

      await completeCheckIn(result?.profile?.phone || phone, appointmentId, {
        profilePhone: getCallerPhoneForAppointmentRpc(),
        services: selectedServices,
        addOns: selectedAddOns,
        refreshmentPref: safeRefreshmentPref,
      })

      setNewUserDetails({
        fullName: result?.name || 'Guest',
        refreshmentPref: safeRefreshmentPref || '',
      })
      setNewUserSuccess(true)
    } catch (err) {
      console.error('Check-in confirm error:', err)
      setError(err.message || 'Failed to complete check-in')
    } finally {
      setLoading(false)
    }
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

      const appointmentId = result?.appointment?.id
      if (appointmentId && (result?.isNew || result?.registrationCompleted)) {
        await completeCheckIn(profilePhone || phone, appointmentId, {
          profilePhone: profilePhone || phone,
          refreshmentPref: result?.appointment?.refreshment_pref || newUserDetails.refreshmentPref || null,
        })
      }
      
      // Show success screen first, then hide waiver — prevents intermediate RegistrationModal re-mount
      if (result?.isNew || result?.registrationCompleted) {
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
          setRefreshmentPref('')
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
                setRefreshmentPref('')
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
          if (result && !result.isNew && !result.needsRegistration && result.appointment) {
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

  if (result && !result.isNew && !result.needsRegistration && result.appointment) {
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
            <div className="bg-secondary border border-theme rounded-xl p-4 mb-6 text-left">
              <p className="text-secondary text-sm mb-2">Selected:</p>
              <div className="space-y-1">
                {selectedServices.map((s) => (
                  <p key={s.id} className="text-primary font-heading text-base">{s.name} — ${s.price}</p>
                ))}
                {selectedAddOnDetails.map((a) => (
                  <p key={a.id} className="text-primary font-heading text-base">{a.name} — ${a.price}</p>
                ))}
              </div>
              <div className="text-gold font-heading text-2xl mt-2">${totalPrice.toFixed(2)}</div>
            </div>
          )}

          {selectedServices.length > 0 && (
            <div className="mb-6 text-left">
              <RefreshmentSelect
                label="Complementary Drink"
                labelClassName="block text-secondary text-sm mb-2"
                value={refreshmentPref}
                onChange={(e) => setRefreshmentPref(e.target.value)}
                refreshments={refreshmentList}
                loading={refreshmentsLoading}
                emptyLabel="Select a drink (optional)"
                showUnavailableNote
              />
            </div>
          )}

          {selectedServices.length > 0 && customerPoints > 0 && (
            <div className="bg-secondary border border-theme rounded-xl p-4 mb-6 text-left">
              <p className="text-secondary text-sm mb-2">Redeem a reward (one per visit)</p>
              <p className="text-muted text-xs mb-3">Balance: {customerPoints} pts</p>
              {rewardError && <p className="text-red-400 text-xs mb-3">{rewardError}</p>}
              {reservedReward ? (
                <div className="rounded-lg border border-gold/30 p-3">
                  <div className="text-gold font-heading">{reservedReward.name}</div>
                  <div className="text-secondary text-xs mt-1">{reservedReward.points} pts · Code {reservedReward.code}</div>
                  <p className="text-muted text-xs mt-2">Applied automatically at checkout</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {LOYALTY_REWARDS.filter((reward) => customerPoints >= reward.points).map((reward) => (
                    <button
                      key={reward.id}
                      type="button"
                      disabled={rewardSaving}
                      onClick={() => handleReserveReward(reward)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-light hover:border-gold/40 transition-colors disabled:opacity-50"
                    >
                      <div className="text-primary font-heading text-sm">{reward.name}</div>
                      <div className="text-muted text-xs">{reward.points} pts · {reward.description}</div>
                    </button>
                  ))}
                  {LOYALTY_REWARDS.every((reward) => customerPoints < reward.points) && (
                    <p className="text-muted text-xs">Not enough points for available rewards yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <button
              type="button"
              onClick={exitCheckIn}
              disabled={loading}
              className="min-w-[120px] px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all disabled:opacity-50"
            >
              CANCEL
            </button>
            {selectedServices.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmExistingUserCheckIn}
                disabled={loading}
                className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'CONFIRMING...' : 'CONFIRM'}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-left">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (result && (result.isNew || result.needsRegistration)) {
    return (
      <RegistrationModal 
        phone={phone}
        existingProfile={result.profile}
        existingAppointmentId={result.appointment?.id}
        onClose={() => {
          setPhone('')
          setResult(null)
        }}
        onCompleteWaiverTrigger={handleCompleteWaiverTrigger}
      />
    )
  }

  if (kioskExitStep === 'pin' && kioskProfile) {
    return (
      <KioskPinKeypad
        title="Exit Check-in"
        subtitle="Enter your 4-digit PIN"
        onVerify={(pin) => verifyKioskPin(supabase, kioskProfile.id, pin)}
        onSuccess={() => {
          logout()
          navigate('/login', { replace: true })
        }}
        onCancel={() => {
          setKioskExitStep('phone')
          setPhone('')
          setKioskProfile(null)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col animate-fade-in">
      {onNavigate && (
        <div className="p-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="text-secondary hover:text-primary transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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