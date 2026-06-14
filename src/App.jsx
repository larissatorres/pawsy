import { useState, useRef, useEffect, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase, searchMicrochip } from './lib/supabase'

// ─── Theme ───
const C = {
  bg: '#FAFAF7', card: '#FFFFFF', primary: '#FF6B4A', primaryDark: '#E0523A',
  primaryLight: '#FFF0EC', secondary: '#1B4332', secondaryLight: '#D8F3DC',
  accent: '#FFB347', text: '#1A1A1A', textMid: '#4A5568', textLight: '#94A3B8',
  border: '#F0EDE8', success: '#10B981', successBg: '#ECFDF5', info: '#3B82F6',
  infoBg: '#EFF6FF', urgent: '#EF4444', vet: '#7C3AED', vetBg: '#F5F3FF',
  shelter: '#0891B2', shelterBg: '#ECFEFF',
}

const ROLES = { public: { label: 'Public', icon: '👤', color: C.info, bg: C.infoBg },
  vet: { label: 'Veterinary', icon: '🩺', color: C.vet, bg: C.vetBg },
  shelter: { label: 'Shelter / NGO', icon: '🏠', color: C.shelter, bg: C.shelterBg } }

const MOCK_CHIPS = {
  '941000024680135': { animal_name: 'Luna', species: 'cat', color: 'Calico', sex: 'female', owner_name: 'Ana García', owner_city: 'Madrid', owner_phone: '+34 612 345 678', owner_email: 'ana@email.com' },
  '941000036791246': { animal_name: 'Nala', species: 'cat', color: 'Black', sex: 'female', owner_name: 'Carlos López', owner_city: 'Valencia', owner_phone: '+34 623 456 789' },
}

// ─── UI Components ───
const Btn = ({ children, primary, full, small, disabled, onClick, style: s }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    padding: small ? '11px 18px' : '15px 26px', borderRadius: 18, fontWeight: 800,
    fontSize: small ? 13 : 15, fontFamily: "'Nunito',sans-serif", cursor: disabled ? 'default' : 'pointer',
    border: primary ? 'none' : `2px solid ${C.primary}`,
    background: primary ? (disabled ? '#ccc' : `linear-gradient(135deg,${C.primary},${C.primaryDark})`) : 'transparent',
    color: primary ? '#fff' : C.primary, width: full ? '100%' : 'auto',
    boxShadow: primary && !disabled ? '0 4px 18px rgba(255,107,74,0.25)' : 'none',
    transition: 'all 0.2s', opacity: disabled ? 0.5 : 1, ...s
  }}>{children}</button>
)

const Steps = ({ current, total }) => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= current ? C.primary : C.border, transition: 'all 0.4s' }} />
    ))}
  </div>
)

// ─── Barcode Scanner Component ───
function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const html5QrCode = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const startScanner = async () => {
      try {
        html5QrCode.current = new Html5Qrcode('barcode-reader')
        await html5QrCode.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 120 }, formatsToSupport: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14] },
          (text) => { if (mounted) { onScan(text); stopScanner() } },
          () => {}
        )
      } catch (err) {
        if (mounted) setError('Camera not available. Please type the number manually.')
      }
    }
    const stopScanner = async () => {
      try { if (html5QrCode.current) await html5QrCode.current.stop() } catch {}
    }
    startScanner()
    return () => { mounted = false; stopScanner() }
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <div id="barcode-reader" style={{ width: '100%', borderRadius: 20, overflow: 'hidden', minHeight: 250, background: '#000' }} />
      {error && (
        <div style={{ background: '#FEF3C7', borderRadius: 14, padding: 14, marginTop: 12, border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: 13, color: '#92400E' }}>📷 {error}</div>
        </div>
      )}
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>✕</button>
    </div>
  )
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('home')
  const [role, setRole] = useState(null) // null, 'public', 'vet', 'shelter'
  const [vetVerified, setVetVerified] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }
  const go = (s) => setScreen(s)

  return (
    <div style={{ width: '100%', maxWidth: 420, minHeight: '100vh', background: C.bg, position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(0,0,0,0.08)', margin: '0 auto', fontFamily: "'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', gap: 10, background: C.bg, position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}` }}>
        {screen !== 'home' && (
          <button onClick={() => go(role ? 'dashboard' : 'home')} style={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 16, padding: '7px 11px', borderRadius: 12, cursor: 'pointer' }}>←</button>
        )}
        <div style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 3px 10px rgba(255,107,74,0.25)' }}>🐾</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, fontFamily: "'Playfair Display',serif" }}>Pawsy</div>
          <div style={{ fontSize: 9, color: C.textLight, fontWeight: 600 }}>Global Pet Microchip Registry — Free</div>
        </div>
        {role && (
          <div style={{ padding: '4px 10px', borderRadius: 10, fontSize: 10, fontWeight: 800, background: ROLES[role].bg, color: ROLES[role].color }}>
            {ROLES[role].icon} {ROLES[role].label}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
        {screen === 'home' && <HomeScreen setRole={r => { setRole(r); go(r === 'vet' && !vetVerified ? 'vetVerify' : 'dashboard') }} />}
        {screen === 'vetVerify' && <VetVerify onVerified={() => { setVetVerified(true); go('dashboard') }} />}
        {screen === 'dashboard' && <Dashboard role={role} go={go} setRole={setRole} />}
        {screen === 'register' && <RegisterFlow role={role} showToast={showToast} goBack={() => go('dashboard')} />}
        {screen === 'search' && <SearchScreen role={role} showToast={showToast} />}
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(27,67,50,0.95)', color: '#fff', padding: '20px 32px', borderRadius: 22, textAlign: 'center', zIndex: 100, boxShadow: '0 15px 50px rgba(0,0,0,0.25)', maxWidth: 300 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{toast}</div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// HOME — Role selection
// ═══════════════════════════════════════
function HomeScreen({ setRole }) {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ background: `linear-gradient(135deg,${C.primary} 0%,#FF8A65 50%,${C.accent} 100%)`, borderRadius: 26, padding: '36px 24px', marginBottom: 28, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, fontSize: 90, opacity: 0.12, transform: 'rotate(20deg)' }}>🐾</div>
        <div style={{ fontSize: 48, marginBottom: 10 }}>📟</div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: '0 0 8px', fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>Free Global Pet<br/>Microchip Registry</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>Scan. Register. Protect. 30 seconds. Zero cost.</p>
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 16, fontFamily: "'Playfair Display',serif" }}>I am a...</h2>

      {[
        { role: 'vet', icon: '🩺', title: 'Veterinary Professional', desc: 'Register microchips for your patients', color: C.vet, bg: C.vetBg, border: '#C4B5FD' },
        { role: 'shelter', icon: '🏠', title: 'Shelter / NGO / Colony', desc: 'Register rescued animals\' chips', color: C.shelter, bg: C.shelterBg, border: '#A5F3FC' },
        { role: 'public', icon: '👤', title: 'Pet Owner / Public', desc: 'Search microchips or register my own pet', color: C.info, bg: C.infoBg, border: '#BFDBFE' },
      ].map(r => (
        <button key={r.role} onClick={() => setRole(r.role)} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px', width: '100%',
          background: C.card, borderRadius: 22, border: `2px solid ${r.border}`,
          cursor: 'pointer', textAlign: 'left', fontFamily: "'Nunito',sans-serif",
          boxShadow: '0 3px 16px rgba(0,0,0,0.04)', marginBottom: 12, transition: 'all 0.2s'
        }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{r.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: r.color }}>{r.title}</div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{r.desc}</div>
          </div>
          <span style={{ color: C.textLight, fontSize: 20 }}>›</span>
        </button>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 24, marginBottom: 20 }}>
        {[{ n: '5.8K', l: 'Registered', i: '📟' }, { n: '117', l: 'Registries', i: '🌍' }, { n: '€0', l: 'Forever free', i: '💚' }].map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: '14px 8px', textAlign: 'center', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 20 }}>{s.i}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.primary }}>{s.n}</div>
            <div style={{ fontSize: 9, color: C.textLight, fontWeight: 700 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// VET VERIFICATION
// ═══════════════════════════════════════
function VetVerify({ onVerified }) {
  const [form, setForm] = useState({ clinic_name: '', license: '', city: '' })
  const [agreed, setAgreed] = useState(false)

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🩺</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>Vet Verification</h2>
        <p style={{ fontSize: 13, color: C.textLight }}>Quick verification to access professional features</p>
      </div>

      <div style={{ background: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        {[
          { key: 'clinic_name', label: 'Clinic / Hospital name', ph: 'e.g., Clínica Veterinaria Madrid' },
          { key: 'license', label: 'Professional license number', ph: 'Colegiado nº' },
          { key: 'city', label: 'City', ph: 'e.g., Madrid' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 800, display: 'block', marginBottom: 6, color: C.text }}>{f.label}</label>
            <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg, boxSizing: 'border-box' }} />
          </div>
        ))}

        <div onClick={() => setAgreed(!agreed)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 0' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${agreed ? C.success : C.border}`, background: agreed ? C.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>{agreed ? '✓' : ''}</div>
          <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
            I confirm I am a licensed veterinary professional and agree to handle pet owner data responsibly under GDPR/LOPD regulations.
          </div>
        </div>
      </div>

      <div style={{ background: C.infoBg, borderRadius: 16, padding: 14, marginBottom: 20, border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
          🔒 Verification is reviewed within 24h. For the MVP demo, click verify to proceed immediately.
        </div>
      </div>

      <Btn primary full disabled={!form.clinic_name || !form.license || !agreed} onClick={onVerified}>
        ✅ Verify & Continue
      </Btn>
    </div>
  )
}

// ═══════════════════════════════════════
// DASHBOARD — Role-based actions
// ═══════════════════════════════════════
function Dashboard({ role, go, setRole }) {
  const canRegister = role === 'vet' || role === 'shelter' || role === 'public'

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
          {role === 'vet' ? '🩺 Vet Dashboard' : role === 'shelter' ? '🏠 Shelter Dashboard' : '👤 My Pawsy'}
        </h2>
        <p style={{ fontSize: 13, color: C.textLight }}>
          {role === 'vet' ? 'Register and search microchips for your patients' : role === 'shelter' ? 'Manage rescued animals\' microchips' : 'Search microchips and register your pets'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {canRegister && (
          <button onClick={() => go('register')} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '22px 20px',
            background: C.card, borderRadius: 22, border: `2px solid ${C.secondaryLight}`,
            cursor: 'pointer', textAlign: 'left', fontFamily: "'Nunito',sans-serif",
            boxShadow: '0 4px 18px rgba(0,0,0,0.04)'
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 20, background: C.secondaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📷</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: C.secondary }}>Register Microchip</div>
              <div style={{ fontSize: 12, color: C.textLight }}>Scan barcode → Capture data → Done</div>
            </div>
            <span style={{ color: C.textLight, fontSize: 20 }}>›</span>
          </button>
        )}

        <button onClick={() => go('search')} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '22px 20px',
          background: C.card, borderRadius: 22, border: `2px solid #BFDBFE`,
          cursor: 'pointer', textAlign: 'left', fontFamily: "'Nunito',sans-serif",
          boxShadow: '0 4px 18px rgba(0,0,0,0.04)'
        }}>
          <div style={{ width: 60, height: 60, borderRadius: 20, background: C.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🔍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: C.info }}>Search Microchip</div>
            <div style={{ fontSize: 12, color: C.textLight }}>
              {role === 'public' ? 'Find pet info (limited view)' : 'Find owner info from chip number'}
            </div>
          </div>
          <span style={{ color: C.textLight, fontSize: 20 }}>›</span>
        </button>
      </div>

      {/* Privacy info based on role */}
      <div style={{ background: role === 'public' ? C.infoBg : C.vetBg, borderRadius: 18, padding: 18, border: `1px solid ${role === 'public' ? '#BFDBFE' : '#C4B5FD'}`, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: role === 'public' ? '#1E40AF' : C.vet, marginBottom: 8 }}>
          🔒 {role === 'public' ? 'Privacy Protection' : 'Professional Access'}
        </div>
        <div style={{ fontSize: 12, color: role === 'public' ? '#3B82F6' : '#7C3AED', lineHeight: 1.6 }}>
          {role === 'public'
            ? 'For privacy, public searches show pet info only (name, photo, city). Owner contact details are hidden. If you find a lost pet, Pawsy will notify the owner directly.'
            : 'As a verified professional, you can view full owner contact details to reunite lost pets. All searches are logged for security.'}
        </div>
      </div>

      {/* Switch role */}
      <button onClick={() => { setRole(null); go('home') }} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", display: 'block', margin: '0 auto' }}>
        ← Switch role
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// REGISTER FLOW — with real scanner + GDPR
// ═══════════════════════════════════════
function RegisterFlow({ role, showToast, goBack }) {
  const [step, setStep] = useState(0)
  const [chipNumber, setChipNumber] = useState('')
  const [chipScanned, setChipScanned] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [petPhotoTaken, setPetPhotoTaken] = useState(false)
  const [gdprConsent, setGdprConsent] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [form, setForm] = useState({ animal_name: '', species: 'cat', color: '', sex: 'unknown', owner_name: '', owner_phone: '', owner_email: '', owner_city: '' })

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const onBarcodeScan = (code) => {
    setChipNumber(code)
    setChipScanned(true)
    setScanning(false)
    setTimeout(() => setStep(1), 600)
  }

  const manualConfirm = () => {
    if (chipNumber.length >= 9) { setChipScanned(true); setManualMode(false); setTimeout(() => setStep(1), 400) }
  }

  const register = async () => {
    const data = { chip_number: chipNumber, species: form.species, animal_name: form.animal_name, color: form.color, sex: form.sex, owner_name: form.owner_name, owner_phone: form.owner_phone, owner_email: form.owner_email, owner_city: form.owner_city, owner_country: 'ES' }
    try { await supabase.from('microchip_registry').insert([data]) } catch {}
    setRegistered(true)
    showToast('✅ Registered in Pawsy!')
  }

  const reset = () => { setStep(0); setChipNumber(''); setChipScanned(false); setPetPhotoTaken(false); setGdprConsent(false); setRegistered(false); setManualMode(false); setForm({ animal_name: '', species: 'cat', color: '', sex: 'unknown', owner_name: '', owner_phone: '', owner_email: '', owner_city: '' }) }

  if (registered) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ width: 90, height: 90, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto 20px', border: `3px solid ${C.success}` }}>✅</div>
      <h2 style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Registered!</h2>
      <div style={{ background: C.card, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, textAlign: 'left', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono',monospace", color: C.primary, background: C.primaryLight, padding: '8px 14px', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>📟 {chipNumber}</div>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{form.animal_name || 'Pet'}</div>
        <div style={{ fontSize: 13, color: C.textMid }}>{form.color} · {form.species === 'cat' ? '🐱' : form.species === 'dog' ? '🐕' : '🐾'}</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 8 }}>👤 {form.owner_name}</div>
        {form.owner_city && <div style={{ fontSize: 13, color: C.textMid }}>📍 {form.owner_city}</div>}
      </div>
      <Btn primary full onClick={reset}>📷 Register another</Btn>
      <button onClick={goBack} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, marginTop: 14, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>← Dashboard</button>
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>Register Microchip</h2>
      <p style={{ fontSize: 12, color: C.textLight, marginBottom: 16 }}>
        {role === 'vet' ? '🩺 Professional registration' : role === 'shelter' ? '🏠 Shelter registration' : '👤 Personal registration'}
      </p>
      <Steps current={step} total={4} />

      {/* STEP 0: Scan chip */}
      {step === 0 && (
        <div>
          {scanning ? (
            <BarcodeScanner onScan={onBarcodeScan} onClose={() => setScanning(false)} />
          ) : chipScanned ? (
            <div style={{ background: C.successBg, borderRadius: 20, padding: 24, border: `2px solid ${C.success}`, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.success, marginBottom: 4 }}>Scanned successfully!</div>
              <div style={{ fontSize: 20, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.text }}>{chipNumber}</div>
            </div>
          ) : (
            <>
              <div onClick={() => setScanning(true)} style={{
                width: '100%', minHeight: 200, borderRadius: 24, background: C.card, border: `2px dashed ${C.border}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 28, cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center'
              }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📷</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>Scan microchip barcode</div>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>Point camera at the barcode sticker</div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button onClick={() => setManualMode(!manualMode)} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
                  ⌨️ Type number manually
                </button>
              </div>
              {manualMode && (
                <div style={{ marginTop: 14 }}>
                  <input value={chipNumber} onChange={e => setChipNumber(e.target.value)} placeholder="Type chip number..."
                    style={{ width: '100%', padding: '16px', borderRadius: 16, border: `2px solid ${C.primary}`, fontSize: 18, fontFamily: "'JetBrains Mono',monospace", outline: 'none', background: C.card, boxSizing: 'border-box', textAlign: 'center', letterSpacing: 1 }} />
                  <Btn primary full onClick={manualConfirm} disabled={chipNumber.length < 9} style={{ marginTop: 10 }}>Confirm</Btn>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STEP 1: Pet info */}
      {step === 1 && (
        <div>
          <div style={{ background: C.successBg, borderRadius: 12, padding: '8px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.success}` }}>
            <span style={{ fontSize: 14 }}>📟</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: C.success }}>{chipNumber}</span>
          </div>

          {/* Take photo */}
          <div onClick={() => setPetPhotoTaken(true)} style={{
            width: '100%', height: 160, borderRadius: 20, background: petPhotoTaken ? C.successBg : C.card,
            border: `2px dashed ${petPhotoTaken ? C.success : C.border}`, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 16, transition: 'all 0.3s'
          }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>{petPhotoTaken ? '✅' : '🐾'}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: petPhotoTaken ? C.success : C.text }}>{petPhotoTaken ? 'Photo taken!' : 'Tap to take pet photo'}</div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, marginBottom: 10 }}>ANIMAL INFO</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['cat', '🐱 Cat'], ['dog', '🐕 Dog'], ['other', '🐾 Other']].map(([v, l]) => (
              <button key={v} onClick={() => u('species', v)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", border: form.species === v ? 'none' : `1.5px solid ${C.border}`, background: form.species === v ? C.primary : C.card, color: form.species === v ? '#fff' : C.text }}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input value={form.animal_name} onChange={e => u('animal_name', e.target.value)} placeholder="Pet name *" style={{ padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg }} />
            <input value={form.color} onChange={e => u('color', e.target.value)} placeholder="Color / breed" style={{ padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['female', '♀ Female'], ['male', '♂ Male']].map(([v, l]) => (
              <button key={v} onClick={() => u('sex', v)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", border: form.sex === v ? 'none' : `1.5px solid ${C.border}`, background: form.sex === v ? C.primary : C.card, color: form.sex === v ? '#fff' : C.text }}>{l}</button>
            ))}
          </div>
          <Btn primary full onClick={() => setStep(2)} disabled={!form.animal_name}>Next → Owner info</Btn>
          <div style={{ textAlign: 'center', marginTop: 10 }}><Btn small onClick={() => setStep(0)}>← Back</Btn></div>
        </div>
      )}

      {/* STEP 2: Owner info */}
      {step === 2 && (
        <div>
          <div style={{ background: C.successBg, borderRadius: 12, padding: '8px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.success}`, flexWrap: 'wrap' }}>
            <span>📟 <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>{chipNumber}</b></span>
            <span>· 🐾 <b>{form.animal_name}</b></span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, marginBottom: 10 }}>👤 OWNER / GUARDIAN</div>

          {/* ID scan simulation */}
          <button onClick={() => { u('owner_name', 'María García López'); u('owner_city', 'Madrid') }} style={{
            width: '100%', padding: '14px', borderRadius: 14, background: C.card, border: `1.5px dashed ${C.border}`,
            cursor: 'pointer', textAlign: 'center', fontFamily: "'Nunito',sans-serif", marginBottom: 12
          }}>
            <span style={{ fontSize: 22 }}>🪪</span>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>Scan ID document (auto-fill)</div>
            <div style={{ fontSize: 11, color: C.textLight }}>DNI, NIE, passport</div>
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: C.textLight, marginBottom: 12, fontWeight: 600 }}>or fill manually</div>

          {[
            { key: 'owner_name', ph: 'Full name *' },
            { key: 'owner_phone', ph: 'Phone *' },
            { key: 'owner_email', ph: 'Email' },
            { key: 'owner_city', ph: 'City' },
          ].map(f => (
            <input key={f.key} value={form[f.key]} onChange={e => u(f.key, e.target.value)} placeholder={f.ph}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg, marginBottom: 8, boxSizing: 'border-box' }} />
          ))}
          <Btn primary full onClick={() => setStep(3)} disabled={!form.owner_name} style={{ marginTop: 4 }}>Next → Review & consent</Btn>
          <div style={{ textAlign: 'center', marginTop: 10 }}><Btn small onClick={() => setStep(1)}>← Back</Btn></div>
        </div>
      )}

      {/* STEP 3: Review + GDPR consent */}
      {step === 3 && (
        <div>
          <div style={{ background: C.card, borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 14 }}>📋 Review</div>
            <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono',monospace", color: C.primary, background: C.primaryLight, padding: '8px 12px', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>📟 {chipNumber}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🐾</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{form.animal_name}</div>
                <div style={{ fontSize: 12, color: C.textMid }}>{form.color} · {form.species === 'cat' ? '🐱' : form.species === 'dog' ? '🐕' : '🐾'} · {form.sex === 'female' ? '♀' : '♂'}</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 13, color: C.textMid }}>👤 {form.owner_name}</div>
              {form.owner_phone && <div style={{ fontSize: 13, color: C.textMid }}>📞 {form.owner_phone}</div>}
              {form.owner_email && <div style={{ fontSize: 13, color: C.textMid }}>📧 {form.owner_email}</div>}
              {form.owner_city && <div style={{ fontSize: 13, color: C.textMid }}>📍 {form.owner_city}</div>}
            </div>
          </div>

          {/* GDPR Consent */}
          <div style={{ background: '#FFFBEB', borderRadius: 18, padding: 18, border: '1px solid #FDE68A', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#92400E', marginBottom: 10 }}>🔒 Data Protection (GDPR/LOPD)</div>
            <div onClick={() => setGdprConsent(!gdprConsent)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${gdprConsent ? C.success : '#D97706'}`, background: gdprConsent ? C.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900, flexShrink: 0, marginTop: 2 }}>{gdprConsent ? '✓' : ''}</div>
              <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                The pet owner <b>authorizes Pawsy</b> to store their personal data (name, phone, email, city) for the sole purpose of pet identification and reunification. Data will only be shared with verified professionals (vets, shelters) when needed to reunite a lost pet. The owner can request data deletion at any time.
              </div>
            </div>
          </div>

          <Btn primary full onClick={register} disabled={!gdprConsent}>✅ Register in Pawsy — Free</Btn>
          <div style={{ textAlign: 'center', marginTop: 10 }}><Btn small onClick={() => setStep(2)}>← Back</Btn></div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// SEARCH — Role-based visibility
// ═══════════════════════════════════════
function SearchScreen({ role, showToast }) {
  const [chipNum, setChipNum] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const isPrivileged = role === 'vet' || role === 'shelter'

  const search = async (num) => {
    const q = (num || chipNum).trim()
    if (!q) return
    setChipNum(q); setLoading(true); setResult(null)
    try {
      const res = await searchMicrochip(q)
      if (res.found) { setResult({ found: true, data: res.data }) }
      else {
        const mock = MOCK_CHIPS[q]
        setResult(mock ? { found: true, data: mock } : { found: false })
      }
    } catch {
      const mock = MOCK_CHIPS[q]
      setResult(mock ? { found: true, data: mock } : { found: false })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>🔍 Search Microchip</h2>
      <p style={{ fontSize: 12, color: C.textLight, marginBottom: 18 }}>
        {isPrivileged ? 'Full access — owner contact details visible' : 'Public search — limited info for privacy'}
      </p>

      {/* Scanner */}
      {scanning ? (
        <div style={{ marginBottom: 16 }}>
          <BarcodeScanner onScan={(code) => { setScanning(false); search(code) }} onClose={() => setScanning(false)} />
        </div>
      ) : (
        <button onClick={() => setScanning(true)} style={{
          width: '100%', padding: '16px', borderRadius: 18, marginBottom: 12,
          background: C.card, border: `2px dashed ${C.border}`, cursor: 'pointer',
          textAlign: 'center', fontFamily: "'Nunito',sans-serif"
        }}>
          <span style={{ fontSize: 28 }}>📷</span>
          <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>Scan barcode with camera</div>
        </button>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: C.textLight, marginBottom: 10, fontWeight: 600 }}>or type number</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={chipNum} onChange={e => setChipNum(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g., 941000024680135"
          style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: `2px solid ${C.border}`, fontSize: 15, fontFamily: "'JetBrains Mono',monospace", outline: 'none', background: C.card, boxSizing: 'border-box' }} />
        <Btn primary onClick={() => search()}>{loading ? '...' : '🔍'}</Btn>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
        {['Pawsy 🐾', 'REIAC 🇪🇸', 'Europetnet 🇪🇺', 'Animal-ID 🌍'].map((db, i) => (
          <span key={i} style={{ padding: '3px 8px', borderRadius: 8, fontSize: 9, fontWeight: 700, background: i === 0 ? C.primaryLight : C.bg, color: i === 0 ? C.primary : C.textLight, border: `1px solid ${i === 0 ? C.primary : C.border}` }}>{db}</span>
        ))}
      </div>

      {/* Result: Found */}
      {result?.found && (
        <div style={{ background: C.successBg, borderRadius: 22, padding: 22, border: `2px solid ${C.success}`, marginBottom: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: C.success, padding: '4px 12px', borderRadius: 10 }}>✓ FOUND</span>
          <div style={{ marginTop: 14, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: `2px solid ${C.success}` }}>
              {result.data.species === 'dog' ? '🐕' : '🐱'}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{result.data.animal_name}</div>
              <div style={{ fontSize: 13, color: C.textMid }}>{result.data.color} · {result.data.sex === 'female' ? '♀' : '♂'}</div>
            </div>
          </div>

          {/* Owner info — role-dependent visibility */}
          <div style={{ borderTop: `1px solid ${C.success}`, paddingTop: 14 }}>
            {isPrivileged ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.success, marginBottom: 6 }}>OWNER DETAILS ({role === 'vet' ? '🩺 Vet' : '🏠 Shelter'} access)</div>
                <div style={{ fontSize: 14, marginBottom: 4 }}>👤 {result.data.owner_name}</div>
                {result.data.owner_city && <div style={{ fontSize: 14, marginBottom: 4 }}>📍 {result.data.owner_city}</div>}
                {result.data.owner_phone && <a href={`tel:${result.data.owner_phone}`} style={{ fontSize: 14, color: C.primary, fontWeight: 800, display: 'block', marginBottom: 4, textDecoration: 'none' }}>📞 {result.data.owner_phone}</a>}
                {result.data.owner_email && <div style={{ fontSize: 14 }}>📧 {result.data.owner_email}</div>}
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.success, marginBottom: 6 }}>PET INFO (public view)</div>
                {result.data.owner_city && <div style={{ fontSize: 14, marginBottom: 4 }}>📍 Registered in {result.data.owner_city}</div>}
                <div style={{ background: '#fff', borderRadius: 12, padding: 12, marginTop: 10, border: `1px solid ${C.success}` }}>
                  <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
                    🔒 Owner contact details are protected. If you found this pet, tap below and Pawsy will notify the owner directly.
                  </div>
                  <Btn primary full small onClick={() => showToast('🔔 Owner has been notified!')} style={{ marginTop: 10 }}>
                    🔔 Notify owner — "I found your pet!"
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Not found */}
      {result && !result.found && (
        <div style={{ background: '#FEF3C7', borderRadius: 22, padding: 22, border: '2px solid #FDE68A', marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#92400E', marginBottom: 8 }}>Not found in Pawsy</div>
          <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6, marginBottom: 14 }}>This chip is not registered yet. Try external registries:</div>
          {[
            { name: 'REIAC', flag: '🇪🇸', desc: 'Spanish registry' },
            { name: 'Europetnet', flag: '🇪🇺', desc: 'European network' },
            { name: 'Animal-ID.net', flag: '🌍', desc: '117 registries' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '1px solid #FDE68A' : 'none' }}>
              <span style={{ fontSize: 16 }}>{r.flag}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800, color: '#92400E' }}>{r.name}</div><div style={{ fontSize: 10, color: '#B45309' }}>{r.desc}</div></div>
              <span style={{ fontSize: 11, color: '#B45309', fontWeight: 800 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
