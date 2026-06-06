import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { ScrollSelect } from './forms/ScrollSelect';
import { Icon } from './icons/Icon';
import { useThemeStyles } from '../theme/useThemeStyles';

const servicesData = [
  {
    id: 1,
    name: 'The Signature Russian Manicure',
    price: 80,
    duration: 90,
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
  {
    id: 2,
    name: 'Gel-X Extensions',
    price: 100,
    duration: 120,
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
  {
    id: 3,
    name: 'Luxury Spa Pedicure',
    price: 60,
    duration: 60,
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
];

const artists = [
  { id: 1, name: 'Elena - Master Artist' },
  { id: 2, name: 'Sasha - Senior Tech' },
];

const packagesData = [
  {
    id: 'pkg1',
    name: 'The "First Impression" Package',
    description: 'Manicure + Pedicure + Hand Massage',
    originalPrice: 150,
    packagePrice: 135,
    savings: 10,
    tag: 'Save 10%',
  },
  {
    id: 'pkg2',
    name: 'The "Bridal Party" Bundle',
    description: 'Group booking for 4+ people with Complimentary Toast',
    originalPrice: 0,
    packagePrice: 0,
    savings: 0,
    tag: 'Complimentary',
    minPeople: 4,
  },
  {
    id: 'pkg3',
    name: 'The "Russian Routine" Subscription',
    description: 'Pre-pay for 5 manicures, get the 6th free',
    originalPrice: 400,
    packagePrice: 320,
    savings: 20,
    tag: 'Buy 5 Get 1 Free',
  },
];

type AddOn = { name: string; price: number };
type Service = (typeof servicesData)[number];
type Package = (typeof packagesData)[number];

function generateTimeSlots() {
  const slots: { value: string; label: string }[] = [];
  let hour = 9;
  let minute = 0;
  while (hour < 19 || (hour === 19 && minute === 0)) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push({
      value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      label: `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`,
    });
    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }
  return slots;
}

const timeSlots = generateTimeSlots();
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function StepIndicator({ currentStep }: { currentStep: number }) {
  const styles = useThemeStyles();
  const steps = ['Service', 'Schedule', 'Details', 'Confirm'];

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const active = currentStep === stepNum;
        const done = currentStep > stepNum;
        return (
          <View key={label} style={{ alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active || done ? styles.tokens.goldStrong : styles.tokens.inputBg,
                borderWidth: 1,
                borderColor: styles.tokens.borderLight,
              }}
            >
              <Text style={{ color: active || done ? '#121212' : styles.tokens.textSecondary, fontSize: 12 }}>
                {stepNum}
              </Text>
            </View>
            <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 4 }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function BookingCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const styles = useThemeStyles();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const isDateDisabled = (day: number) => {
    const date = new Date(year, month, day);
    return date < today || date.getDay() === 0;
  };

  const isSelected = (day: number) =>
    selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  const canGoPrev = () => {
    const prev = new Date(year, month - 1, 1);
    return prev.getMonth() >= today.getMonth() || prev.getFullYear() > today.getFullYear();
  };

  return (
    <View style={[styles.card, { padding: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable onPress={() => canGoPrev() && setCurrentMonth(new Date(year, month - 1, 1))} disabled={!canGoPrev()}>
          <Icon name="chevronLeft" size={20} color={styles.tokens.goldStrong} style={{ opacity: canGoPrev() ? 1 : 0.3 }} />
        </Pressable>
        <Text style={[styles.textPrimary, { fontWeight: '600' }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}>
          <Icon name="chevronRight" size={20} color={styles.tokens.goldStrong} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {DAY_NAMES.map((day) => (
          <View key={day} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={[styles.textSecondary, { fontSize: 10 }]}>{day}</Text>
          </View>
        ))}
        {Array.from({ length: startingDay }).map((_, i) => (
          <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const disabled = isDateDisabled(day);
          const selected = isSelected(day);
          return (
            <Pressable
              key={day}
              disabled={disabled}
              onPress={() => onSelectDate(new Date(year, month, day))}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? styles.tokens.goldStrong : 'transparent',
                  opacity: disabled ? 0.3 : 1,
                }}
              >
                <Text style={{ color: selected ? '#121212' : styles.tokens.textPrimary, fontSize: 13 }}>
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function BookingWizard() {
  const styles = useThemeStyles();
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', agreed: false });
  const [bookingId, setBookingId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) =>
      prev.find((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, addOn],
    );
  };

  const totalPrice = selectedPackage
    ? selectedPackage.packagePrice + selectedAddOns.reduce((sum, a) => sum + a.price, 0)
    : selectedService
      ? selectedService.price + selectedAddOns.reduce((sum, a) => sum + a.price, 0)
      : 0;

  const totalMinutes = selectedPackage
    ? 150 + selectedAddOns.length * 15
    : selectedService
      ? selectedService.duration + selectedAddOns.length * 15
      : 0;

  const canContinueStep1 = Boolean(selectedService || selectedPackage);

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    if (!formData.agreed) newErrors.agreed = 'You must agree to the cancellation policy';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);
    try {
      const phone = formData.phone.replace(/\D/g, '').slice(-10);
      let userId: string | null = null;
      try {
        const orQuery: string[] = [];
        if (formData.email) orQuery.push(`email.eq.${formData.email}`);
        if (phone) orQuery.push(`phone.eq.${phone}`);
        if (orQuery.length > 0) {
          const { data: found } = await getSupabase()
            .from('profiles')
            .select('id')
            .or(orQuery.join(','))
            .limit(1);
          if (found && found.length > 0) userId = found[0].id;
        }
      } catch {
        /* lookup failed */
      }

      const allNames = [
        ...(selectedService ? [selectedService.name] : selectedPackage ? [selectedPackage.name] : []),
        ...selectedAddOns.map((a) => a.name),
      ].join(', ');

      let scheduledAt: string | null = null;
      if (selectedDate && selectedTime) {
        const [h, m] = selectedTime.split(':').map(Number);
        const dt = new Date(selectedDate);
        dt.setHours(h, m, 0, 0);
        scheduledAt = dt.toISOString();
      } else if (selectedDate) {
        scheduledAt = selectedDate.toISOString();
      }

      const payload = {
        customer_id: userId,
        guest_name: formData.name || null,
        guest_email: formData.email || null,
        guest_phone: phone || null,
        service_id: selectedService?.id || null,
        add_ons: allNames || null,
        final_price: totalPrice || 0,
        technician_id: null,
        scheduled_at: scheduledAt,
        status: 'confirmed',
        booking_type: 'online',
      };

      const { data: apptData, error: apptErr } = await getSupabase()
        .from('appointments')
        .insert(payload)
        .select('id')
        .limit(1)
        .single();
      if (apptErr) throw apptErr;
      setBookingId(apptData?.id || `NC-${Date.now().toString(36).toUpperCase()}`);
      setStep(4);
    } catch {
      setErrors({ general: 'Failed to save booking. Please try again or contact support.' });
    }
    setSubmitting(false);
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedPackage(null);
    setSelectedService(null);
    setSelectedAddOns([]);
    setSelectedDate(null);
    setSelectedTime('');
    setSelectedArtist('');
    setFormData({ name: '', email: '', phone: '', agreed: false });
    setErrors({});
    setBookingId('');
  };

  const inputStyle = {
    backgroundColor: styles.tokens.inputBg,
    borderColor: styles.tokens.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: styles.tokens.textPrimary,
    marginTop: 6,
    marginBottom: 4,
  };

  const artistOptions = [
    { value: '', label: 'Choose an artist...' },
    ...artists.map((a) => ({ value: a.name, label: a.name })),
  ];

  const addOnSource = selectedService?.addOns || [
    { name: 'French Tip', price: 15 },
    { name: 'Chrome Finish', price: 20 },
    { name: 'Strength Layer', price: 10 },
    { name: 'Luxury Hand Massage', price: 25 },
  ];

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={[styles.textGold, { fontSize: 26, fontWeight: '600', textAlign: 'center' }]}>
          Book Your Appointment
        </Text>
        <Text style={[styles.textSecondary, { marginTop: 6, textAlign: 'center' }]}>
          Reserve your moment of luxury
        </Text>
      </View>

      {step < 4 && <StepIndicator currentStep={step} />}

      {step === 1 && (
        <View style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16 }]}>
            Select Your Service or Package
          </Text>

          <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginBottom: 8 }]}>
            SPECIAL PACKAGES
          </Text>
          {packagesData.map((pkg) => {
            const active = selectedPackage?.id === pkg.id;
            return (
              <Pressable
                key={pkg.id}
                onPress={() => {
                  setSelectedPackage(pkg);
                  setSelectedService(null);
                  setSelectedAddOns([]);
                }}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? styles.tokens.goldStrong : styles.tokens.borderLight,
                  backgroundColor: active ? `${styles.tokens.goldStrong}12` : 'transparent',
                }}
              >
                {pkg.tag ? (
                  <Text style={[styles.textGold, { fontSize: 10, marginBottom: 4 }]}>{pkg.tag}</Text>
                ) : null}
                <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{pkg.name}</Text>
                <Text style={[styles.textSecondary, { fontSize: 13, marginTop: 4 }]}>{pkg.description}</Text>
                {pkg.originalPrice > 0 ? (
                  <Text style={[styles.textGold, { marginTop: 6 }]}>
                    ${pkg.packagePrice}{' '}
                    <Text style={{ textDecorationLine: 'line-through', color: styles.tokens.textMuted }}>
                      ${pkg.originalPrice}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.textGold, { marginTop: 6 }]}>Custom Quote</Text>
                )}
              </Pressable>
            );
          })}

          <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginVertical: 12 }]}>
            INDIVIDUAL SERVICES
          </Text>
          {servicesData.map((service) => {
            const active = selectedService?.id === service.id;
            return (
              <Pressable
                key={service.id}
                onPress={() => {
                  setSelectedPackage(null);
                  setSelectedService(service);
                  setSelectedAddOns([]);
                }}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? styles.tokens.goldStrong : styles.tokens.borderLight,
                  backgroundColor: active ? `${styles.tokens.goldStrong}12` : 'transparent',
                }}
              >
                <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{service.name}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={styles.textGold}>${service.price}</Text>
                  <Text style={styles.textSecondary}>{service.duration} min</Text>
                </View>
              </Pressable>
            );
          })}

          {canContinueStep1 && (
            <>
              <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginTop: 12, marginBottom: 8 }]}>
                EXTRA ENHANCEMENTS
              </Text>
              {addOnSource.map((addOn) => {
                const isSelected = selectedAddOns.some((a) => a.name === addOn.name);
                return (
                  <Pressable
                    key={addOn.name}
                    onPress={() => toggleAddOn(addOn)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? styles.tokens.goldStrong : styles.tokens.borderLight,
                      backgroundColor: isSelected ? `${styles.tokens.goldStrong}12` : 'transparent',
                    }}
                  >
                    <Text style={styles.textPrimary}>{addOn.name}</Text>
                    <Text style={styles.textGold}>+${addOn.price}</Text>
                  </Pressable>
                );
              })}
              <View style={[styles.card, { padding: 12, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }]}>
                <Text style={styles.textSecondary}>Total Time: {totalMinutes} min</Text>
                <Text style={styles.textGold}>${totalPrice}</Text>
              </View>
            </>
          )}

          <Pressable
            onPress={() => canContinueStep1 && setStep(2)}
            disabled={!canContinueStep1}
            style={[styles.buttonPrimary, { marginTop: 16, opacity: canContinueStep1 ? 1 : 0.4 }]}
          >
            <Text style={styles.buttonPrimaryText}>CONTINUE</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16 }]}>
            Schedule Your Appointment
          </Text>

          <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginBottom: 8 }]}>SELECT DATE</Text>
          <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginTop: 16, marginBottom: 8 }]}>
            SELECT TIME
          </Text>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {timeSlots.map((slot) => {
                const active = selectedTime === slot.value;
                return (
                  <Pressable
                    key={slot.value}
                    onPress={() => setSelectedTime(slot.value)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? styles.tokens.goldStrong : styles.tokens.borderLight,
                      backgroundColor: active ? styles.tokens.goldStrong : 'transparent',
                    }}
                  >
                    <Text style={{ color: active ? '#121212' : styles.tokens.textPrimary, fontSize: 12 }}>
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginTop: 16, marginBottom: 8 }]}>
            SELECT ARTIST (OPTIONAL)
          </Text>
          <ScrollSelect value={selectedArtist} onChange={setSelectedArtist} options={artistOptions} />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <Pressable
              onPress={() => setStep(1)}
              style={{
                flex: 1,
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: styles.tokens.borderLight,
              }}
            >
              <Text style={styles.textPrimary}>BACK</Text>
            </Pressable>
            <Pressable
              onPress={() => selectedDate && selectedTime && setStep(3)}
              disabled={!selectedDate || !selectedTime}
              style={[styles.buttonPrimary, { flex: 1, opacity: selectedDate && selectedTime ? 1 : 0.4 }]}
            >
              <Text style={styles.buttonPrimaryText}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16 }]}>
            Your Details
          </Text>

          <Text style={styles.textSecondary}>Full Name</Text>
          <TextInput
            value={formData.name}
            onChangeText={(name) => setFormData({ ...formData, name })}
            placeholder="Alexandra Chen"
            placeholderTextColor={styles.tokens.textMuted}
            style={[inputStyle, errors.name ? { borderColor: '#f87171' } : null]}
          />
          {errors.name ? <Text style={{ color: '#f87171', fontSize: 12 }}>{errors.name}</Text> : null}

          <Text style={[styles.textSecondary, { marginTop: 12 }]}>Email</Text>
          <TextInput
            value={formData.email}
            onChangeText={(email) => setFormData({ ...formData, email })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="alexandra@example.com"
            placeholderTextColor={styles.tokens.textMuted}
            style={[inputStyle, errors.email ? { borderColor: '#f87171' } : null]}
          />
          {errors.email ? <Text style={{ color: '#f87171', fontSize: 12 }}>{errors.email}</Text> : null}

          <Text style={[styles.textSecondary, { marginTop: 12 }]}>Phone</Text>
          <TextInput
            value={formData.phone}
            onChangeText={(phone) =>
              setFormData({ ...formData, phone: phone.replace(/\D/g, '').slice(0, 10) })
            }
            keyboardType="phone-pad"
            placeholder="5045551234"
            placeholderTextColor={styles.tokens.textMuted}
            style={[inputStyle, errors.phone ? { borderColor: '#f87171' } : null]}
          />
          {errors.phone ? <Text style={{ color: '#f87171', fontSize: 12 }}>{errors.phone}</Text> : null}

          <Pressable
            onPress={() => setFormData({ ...formData, agreed: !formData.agreed })}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: formData.agreed ? styles.tokens.goldStrong : styles.tokens.borderLight,
                backgroundColor: formData.agreed ? styles.tokens.goldStrong : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {formData.agreed ? <Icon name="check" size={12} color="#121212" strokeWidth={3} /> : null}
            </View>
            <Text style={[styles.textSecondary, { flex: 1, fontSize: 13 }]}>
              I agree to the 24-hour cancellation policy
            </Text>
          </Pressable>
          {errors.agreed ? <Text style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.agreed}</Text> : null}
          {errors.general ? (
            <Text style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{errors.general}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <Pressable
              onPress={() => setStep(2)}
              style={{
                flex: 1,
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: styles.tokens.borderLight,
              }}
            >
              <Text style={styles.textPrimary}>BACK</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.buttonPrimary, { flex: 1, opacity: submitting ? 0.6 : 1 }]}
            >
              <Text style={styles.buttonPrimaryText}>{submitting ? 'BOOKING...' : 'CONFIRM BOOKING'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={[styles.card, { padding: 24, alignItems: 'center' }]}>
          <Icon name="check" size={48} color={styles.tokens.goldStrong} strokeWidth={2} style={{ marginBottom: 12 }} />
          <Text style={[styles.textPrimary, { fontSize: 22, fontWeight: '600', textAlign: 'center' }]}>
            Booking Confirmed!
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
            Reference: {bookingId}
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 12 }]}>
            {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {selectedTime
              ? ` at ${timeSlots.find((s) => s.value === selectedTime)?.label}`
              : ''}
          </Text>
          <Pressable onPress={resetBooking} style={[styles.buttonPrimary, { marginTop: 24, alignSelf: 'stretch' }]}>
            <Text style={styles.buttonPrimaryText}>BOOK ANOTHER</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
