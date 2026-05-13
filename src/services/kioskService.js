import { supabase } from '../lib/supabase'

export async function processCheckIn(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, '')

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone_number', cleanPhone)

  if (profileError) {
    console.error('Profile search error:', profileError)
    throw profileError
  }

  if (profiles && profiles.length > 0) {
    const profile = profiles[0]

    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        profile_id: profile.id,
        status: 'Checked-In',
        check_in_time: new Date().toISOString()
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('Appointment insert error:', appointmentError)
      throw appointmentError
    }

    return {
      isNew: false,
      name: profile.full_name,
      appointment: appointments
    }
  }

  return { isNew: true }
}