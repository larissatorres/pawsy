import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = createClient(url, key)

// ─── Auth ───
export const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
export const signOut = () => supabase.auth.signOut()
export const getSession = () => supabase.auth.getSession()
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s?.user || null))

// ─── Microchip CRUD ───
export async function searchMicrochip(num) {
  const { data, error } = await supabase.from('microchip_registry').select('*').eq('chip_number', num).single()
  return { data, error, found: !!data }
}

export async function registerMicrochip(form) {
  const { data, error } = await supabase.from('microchip_registry').insert([form]).select()
  return { data, error, success: !error }
}

export async function getMyPets(userId) {
  const { data } = await supabase.from('microchip_registry').select('*').eq('registered_by_auth', userId).order('created_at', { ascending: false })
  return data || []
}

export async function updatePet(id, updates) {
  const { error } = await supabase.from('microchip_registry').update(updates).eq('id', id)
  return !error
}

export async function deletePet(id) {
  const { error } = await supabase.from('microchip_registry').delete().eq('id', id)
  return !error
}

// ─── Photos ───
export async function uploadPhoto(file, userId) {
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('pet-photos').upload(path, file)
  if (error) return null
  return supabase.storage.from('pet-photos').getPublicUrl(path).data.publicUrl
}
