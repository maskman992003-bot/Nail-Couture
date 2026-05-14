import { supabase } from '../lib/supabase'

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('category', { ascending: true })
    .order('price', { ascending: true })

  console.log('Services from DB:', data, error)
  if (error) {
    console.error('Error fetching services:', error)
    throw error
  }

  return data || []
}

export async function updateService(serviceId, updates) {
  const { error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)

  if (error) {
    console.error('Error updating service:', error)
    return false
  }

  return true
}