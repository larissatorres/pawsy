import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = createClient(url, key)

// ─── Auth ───
export const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
export const signOut = () => supabase.auth.signOut()
export const getSession = () => supabase.auth.getSession()
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s?.user || null))

// ─── Profile (role + admin) ───
// DB enum user_role accepts: 'user' | 'shelter' | 'admin'.
// The UI uses 'public'/'vet'/'shelter'; map before writing.
function uiRoleToDb(role){
  if(role==='shelter') return 'shelter'
  return 'user' // 'public' and 'vet' both persist as 'user' (vet status lives in vet_verifications)
}
export async function getProfile(userId) {
  // maybeSingle() returns null (not a 406 error) when the row doesn't exist yet
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (data) return data
  // Self-heal: create the profile if the signup trigger never ran for this user
  const { data: created } = await supabase.from('profiles')
    .upsert({ id: userId, role: 'user' }, { onConflict: 'id' })
    .select().maybeSingle()
  return created || { id: userId, role: 'user', is_admin: false }
}
export async function setProfileRole(userId, role) {
  const { error } = await supabase.from('profiles').update({ role: uiRoleToDb(role) }).eq('id', userId)
  return !error
}

// ─── Vet verification ───
export async function getMyVetStatus(userId) {
  const { data } = await supabase.from('vet_verifications').select('*').eq('user_id', userId).maybeSingle()
  return data || null   // null = never applied
}

export async function submitVetVerification(userId, payload) {
  // upsert so a rejected user can resubmit
  const row = { user_id: userId, ...payload, status: 'pending', reviewed_by: null, reviewed_at: null, reject_reason: null }
  const { data, error } = await supabase.from('vet_verifications')
    .upsert(row, { onConflict: 'user_id' }).select().single()
  return { data, error, success: !error }
}

export async function uploadVetDoc(file, userId) {
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('vet-docs').upload(path, file)
  if (error) return null
  // private bucket → signed URL (valid 1h) for admin review
  const { data } = await supabase.storage.from('vet-docs').createSignedUrl(path, 3600)
  return { path, signedUrl: data?.signedUrl || null }
}

export async function getVetDocSignedUrl(path) {
  const { data } = await supabase.storage.from('vet-docs').createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

// ─── Admin ───
export async function listPendingVets() {
  const { data } = await supabase.from('vet_verifications')
    .select('*').order('created_at', { ascending: true })
  return data || []
}
export async function reviewVet(id, status, reviewerId, reason = null) {
  const { error } = await supabase.from('vet_verifications')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), reject_reason: reason })
    .eq('id', id)
  return !error
}

// ─── Microchip CRUD ───
export async function searchMicrochip(num) {
  const { data, error } = await supabase.from('microchip_registry').select('*').eq('chip_number', num).maybeSingle()
  return { data, error, found: !!data }
}

export async function registerMicrochip(form) {
  const { data, error } = await supabase.from('microchip_registry').insert([form]).select()
  // surface duplicate-key as a friendly flag
  const duplicate = error?.code === '23505'
  return { data, error, success: !error, duplicate }
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

// ─── Validation helpers ───
export function isValidEmail(email) {
  if (!email) return true // email is optional in registration
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// Loose international phone check: + optional, 7–15 digits, spaces/dashes/parens allowed
export function isValidPhone(phone) {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-().]/g, '')
  return /^\+?\d{7,15}$/.test(cleaned)
}
