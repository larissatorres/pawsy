import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── API Functions ───

export async function fetchCats(filter = 'all') {
  let query = supabase
    .from('cats')
    .select('*')
    .eq('publication_status', 'approved')
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (filter === 'urgent') query = query.in('urgency', ['high', 'emergency'])
  if (filter === 'kittens') query = query.lte('age_months', 12)
  if (filter === 'senior') query = query.gte('age_months', 60)

  const { data, error } = await query
  return { data: data || [], error }
}

export async function fetchCatById(id) {
  const { data, error } = await supabase
    .from('cats')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function searchMicrochip(chipNumber) {
  const { data, error } = await supabase
    .from('microchip_registry')
    .select('*')
    .eq('chip_number', chipNumber)
    .single()
  return { data, error, found: !!data }
}

export async function registerMicrochip(formData) {
  const { data, error } = await supabase
    .from('microchip_registry')
    .insert([formData])
  return { data, error, success: !error }
}

export async function fetchColonies() {
  const { data, error } = await supabase
    .from('colonies')
    .select('*')
    .order('status', { ascending: false })
  return { data: data || [], error }
}

export async function submitReport(reportData) {
  const { data, error } = await supabase
    .from('reports')
    .insert([reportData])
  return { data, error, success: !error }
}

export async function fetchLostFound(type = 'found') {
  const { data, error } = await supabase
    .from('lost_found')
    .select('*')
    .eq('type', type)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function submitDonation(donationData) {
  const { data, error } = await supabase
    .from('donations')
    .insert([donationData])
  return { data, error, success: !error }
}
