import { supabase } from '../lib/supabase'

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('category', { ascending: true })
    .order('price', { ascending: true })
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

export async function createService(service) {
  const { data, error } = await supabase
    .from('services')
    .insert([service])
    .select()
    .single()

  if (error) {
    console.error('Error creating service:', error)
    return null
  }

  return data
}

export async function deleteService(serviceId) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)

  if (error) {
    console.error('Error deleting service:', error)
    return false
  }

  return true
}