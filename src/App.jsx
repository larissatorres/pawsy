import { useState, useRef, useEffect } from 'react'
import { supabase, searchMicrochip } from './lib/supabase'

const C = {
  bg: '#FAFAF7', card: '#FFFFFF', primary: '#FF6B4A', primaryDark: '#E0523A',
  primaryLight: '#FFF0EC', secondary: '#1B4332', secondaryLight: '#D8F3DC',
  accent: '#FFB347', text: '#1A1A1A', textMid: '#4A5568', textLight: '#94A3B8',
  border: '#F0EDE8', success: '#10B981', successBg: '#ECFDF5', info: '#3B82F6',
  infoBg: '#EFF6FF', urgent: '#EF4444',
}

const MOCK_CHIPS = {
  '941000024680135': { animal_name: 'Luna', species: 'cat', color: 'Calico', sex: 'female', owner_name: 'Ana García', owner_city: 'Madrid', owner_phone: '+34 612 345 678', owner_email: 'ana@email.com' },
  '941000036791246': { animal_name: 'Nala', species: 'cat', color: 'Black', sex: 'female', owner_name: 'Carlos López', owner_city: 'Valencia', owner_phone: '+34 623 456 789' },
}

// ─── Shared UI ───
const Btn = ({ children, primary, full, small, disabled, onClick, style: s }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    padding: small ? '12px 20px' : '16px 28px', borderRadius: 20, fontWeight: 800,
    fontSize: small ? 14 : 16, fontFamily: "'Nunito',sans-serif", cursor: disabled ? 'default' : 'pointer',
    border: primary ? 'none' : `2px solid ${C.primary}`,
    background: primary ? (disabled ? '#ccc' : `linear-gradient(135deg,${C.primary},${C.primaryDark})`) : 'transparent',
    color: primary ? '#fff' : C.primary, width: full ? '100%' : 'auto',
    boxShadow: primary && !disabled ? '0 4px 20px rgba(255,107,74,0.3)' : 'none',
    transition: 'all 0.2s', opacity: disabled ? 0.5 : 1, ...s
  }}>{children}</button>
)

const StepDot = ({ current, total }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= current ? C.primary : C.border, transition: 'all 0.4s' }} />
    ))}
  </div>
)

const ScanBox = ({ icon, title, subtitle, scanned, scannedText, onClick }) => (
  <div onClick={onClick} style={{
    width: '100%', minHeight: 200, borderRadius: 24, cursor: 'pointer',
    background: scanned ? C.successBg : C.card, border: `2px dashed ${scanned ? C.success : C.border}`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '28px 20px', transition: 'all 0.3s', textAlign: 'center'
  }}>
    <div style={{ fontSize: 56, marginBottom: 12 }}>{scanned ? '✅' : icon}</div>
    <div style={{ fontSize: 16, fontWeight: 900, color: scanned ? C.success : C.text, marginBottom: 4 }}>
      {scanned ? scannedText : title}
    </div>
    <div style={{ fontSize: 12, color: C.textLight }}>{subtitle}</div>
  </div>
)

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('home')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  return (
    <div style={{ width: '100%', maxWidth: 420, minHeight: '100vh', background: C.bg, position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(0,0,0,0.08)', margin: '0 auto', fontFamily: "'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', gap: 10, background: C.bg, position: 'sticky', top: 0, zIndex: 50, borderBottom: screen !== 'home' ? `1px solid ${C.border}` : 'none' }}>
        {screen !== 'home' && (
          <button onClick={() => setScreen('home')} style={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 18, padding: '8px 12px', borderRadius: 14, cursor: 'pointer' }}>←</button>
        )}
        <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 3px 10px rgba(255,107,74,0.3)' }}>🐾</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Playfair Display',serif" }}>Pawsy</div>
          <div style={{ fontSize: 9, color: C.textLight, fontWeight: 600 }}>Global Pet Microchip Registry — Free</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
        {screen === 'home' && <HomeScreen go={setScreen} />}
        {screen === 'register' && <RegisterFlow showToast={showToast} goHome={() => setScreen('home')} />}
        {screen === 'search' && <SearchScreen showToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(27,67,50,0.95)', color: '#fff', padding: '22px 36px', borderRadius: 24, textAlign: 'center', zIndex: 100, boxShadow: '0 15px 50px rgba(0,0,0,0.25)', maxWidth: 300 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{toast}</div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// HOME — Two actions only
// ═══════════════════════════════════════════
function HomeScreen({ go }) {
  return (
    <div style={{ padding: '0 20px' }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg,${C.primary} 0%,#FF8A65 50%,${C.accent} 100%)`,
        borderRadius: 28, padding: '40px 26px', marginBottom: 28, position: 'relative', overflow: 'hidden', textAlign: 'center'
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, fontSize: 100, opacity: 0.12, transform: 'rotate(20deg)' }}>🐾</div>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📟</div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: '0 0 10px', fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>
          Free Global Pet<br/>Microchip Registry
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Scan. Register. Protect.<br/>30 seconds. Zero cost.
        </p>
      </div>

      {/* Two main actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        <button onClick={() => go('register')} style={{
          display: 'flex', alignItems: 'center', gap: 18, padding: '24px 22px',
          background: C.card, borderRadius: 24, border: `2px solid ${C.secondaryLight}`,
          cursor: 'pointer', textAlign: 'left', fontFamily: "'Nunito',sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.2s'
        }}>
          <div style={{ width: 68, height: 68, borderRadius: 22, background: C.secondaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0 }}>📷</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.secondary, marginBottom: 4 }}>Register Microchip</div>
            <div style={{ fontSize: 13, color: C.textLight, lineHeight: 1.4 }}>Scan barcode → Capture ID → Photo → Done</div>
          </div>
          <span style={{ color: C.textLight, fontSize: 22 }}>›</span>
        </button>

        <button onClick={() => go('search')} style={{
          display: 'flex', alignItems: 'center', gap: 18, padding: '24px 22px',
          background: C.card, borderRadius: 24, border: `2px solid #BFDBFE`,
          cursor: 'pointer', textAlign: 'left', fontFamily: "'Nunito',sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.2s'
        }}>
          <div style={{ width: 68, height: 68, borderRadius: 22, background: C.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0 }}>🔍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.info, marginBottom: 4 }}>Search Microchip</div>
            <div style={{ fontSize: 13, color: C.textLight, lineHeight: 1.4 }}>Find owner info from chip number</div>
          </div>
          <span style={{ color: C.textLight, fontSize: 22 }}>›</span>
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
        {[{ n: '5.8K', l: 'Registered', i: '📟' }, { n: '117', l: 'Registries', i: '🌍' }, { n: '€0', l: 'Always free', i: '💚' }].map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 16, padding: '16px 10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22 }}>{s.i}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>{s.n}</div>
            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 700 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ background: C.card, borderRadius: 20, padding: 22, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <h3 style={{ fontSize: 17, fontWeight: 900, margin: '0 0 18px', fontFamily: "'Playfair Display',serif" }}>How it works</h3>
        {[
          { icon: '📷', title: 'Scan barcode', desc: 'Point camera at the microchip barcode sticker' },
          { icon: '🪪', title: 'Capture owner ID', desc: 'Photograph the owner\'s ID — data fills automatically' },
          { icon: '🐾', title: 'Snap pet photo', desc: 'Take a quick photo of the pet' },
          { icon: '✅', title: 'Registered!', desc: 'Chip is now in the global Pawsy database' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 16 : 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: '#fff', fontWeight: 900 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.textLight, lineHeight: 1.4, marginTop: 2 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Why Pawsy */}
      <div style={{ background: C.infoBg, borderRadius: 20, padding: 22, border: `1px solid #BFDBFE`, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: '#1E40AF', marginBottom: 12 }}>💡 Why Pawsy?</h3>
        {[
          'Official registries charge €40+ per registration',
          'Pawsy is 100% free — forever',
          'Works globally, not limited to one country',
          'Instant search across our database',
          'Any vet, any country, any pet',
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: C.success, fontWeight: 900 }}>✓</span>
            <span style={{ fontSize: 13, color: '#1E40AF' }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// REGISTER FLOW — The core product
// ═══════════════════════════════════════════
function RegisterFlow({ showToast, goHome }) {
  const [step, setStep] = useState(0)
  const [chipNumber, setChipNumber] = useState('')
  const [chipScanned, setChipScanned] = useState(false)
  const [idScanned, setIdScanned] = useState(false)
  const [petPhotoTaken, setPetPhotoTaken] = useState(false)
  const [form, setForm] = useState({
    animal_name: '', species: 'cat', color: '', sex: 'unknown',
    owner_name: '', owner_phone: '', owner_email: '', owner_city: '',
  })
  const [registered, setRegistered] = useState(false)
  const [manualChip, setManualChip] = useState(false)

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const simulateScanBarcode = () => {
    const fakeChip = '941000' + String(Math.floor(Math.random() * 900000000 + 100000000))
    setChipNumber(fakeChip)
    setChipScanned(true)
    setTimeout(() => setStep(1), 800)
  }

  const simulateScanID = () => {
    setIdScanned(true)
    updateForm('owner_name', 'María García López')
    updateForm('owner_city', 'Madrid')
    setTimeout(() => setStep(2), 800)
  }

  const takePhoto = () => {
    setPetPhotoTaken(true)
    setTimeout(() => setStep(3), 600)
  }

  const register = async () => {
    const data = { chip_number: chipNumber, species: form.species, ...form }
    try {
      await supabase.from('microchip_registry').insert([data])
    } catch (e) { console.log('Using mock mode') }
    setRegistered(true)
    showToast('✅ Registered in Pawsy!')
  }

  if (registered) return (
    <div style={{ padding: '50px 20px', textAlign: 'center' }}>
      <div style={{ width: 100, height: 100, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, margin: '0 auto 20px', border: `3px solid ${C.success}` }}>✅</div>
      <h2 style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Registered!</h2>
      <div style={{ background: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.border}`, textAlign: 'left', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🐾</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{form.animal_name || 'Pet'}</div>
            <div style={{ fontSize: 12, color: C.textMid }}>{form.color} · {form.species === 'cat' ? '🐱' : form.species === 'dog' ? '🐕' : '🐾'}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: C.primary, background: C.primaryLight, padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontWeight: 700 }}>
          📟 {chipNumber}
        </div>
        <div style={{ fontSize: 13, color: C.textMid }}>👤 {form.owner_name}</div>
        <div style={{ fontSize: 13, color: C.textMid }}>📍 {form.owner_city}</div>
        {form.owner_phone && <div style={{ fontSize: 13, color: C.textMid }}>📞 {form.owner_phone}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn primary full onClick={() => { setRegistered(false); setStep(0); setChipScanned(false); setIdScanned(false); setPetPhotoTaken(false); setChipNumber(''); setManualChip(false); setForm({ animal_name: '', species: 'cat', color: '', sex: 'unknown', owner_name: '', owner_phone: '', owner_email: '', owner_city: '' }) }}>
          📷 Register another
        </Btn>
      </div>
      <button onClick={goHome} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 14, marginTop: 16, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>← Back to home</button>
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>Register Microchip</h2>
      <p style={{ fontSize: 13, color: C.textLight, marginBottom: 20 }}>4 steps · ~30 seconds</p>

      <StepDot current={step} total={4} />

      {/* STEP 0: Scan barcode */}
      {step === 0 && (
        <div>
          <ScanBox
            icon="📷" title="Scan microchip barcode"
            subtitle="Point camera at the barcode sticker on the chip packaging"
            scanned={chipScanned} scannedText={`✓ Scanned: ${chipNumber}`}
            onClick={!chipScanned ? simulateScanBarcode : undefined}
          />

          {!chipScanned && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => setManualChip(true)} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
                Type manually instead
              </button>
            </div>
          )}

          {manualChip && !chipScanned && (
            <div style={{ marginTop: 16 }}>
              <input value={chipNumber} onChange={e => setChipNumber(e.target.value)}
                placeholder="Type chip number..."
                style={{ width: '100%', padding: '16px 18px', borderRadius: 18, border: `2px solid ${C.primary}`, fontSize: 18, fontFamily: "'JetBrains Mono',monospace", outline: 'none', background: C.card, boxSizing: 'border-box', textAlign: 'center', letterSpacing: 1 }} />
              <Btn primary full onClick={() => { if (chipNumber.length >= 9) { setChipScanned(true); setTimeout(() => setStep(1), 500) } }} style={{ marginTop: 12 }} disabled={chipNumber.length < 9}>
                Confirm number
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: Scan ID */}
      {step === 1 && (
        <div>
          <div style={{ background: C.successBg, borderRadius: 14, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.success}` }}>
            <span style={{ fontSize: 16 }}>📟</span>
            <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: C.success }}>{chipNumber}</span>
          </div>

          <ScanBox
            icon="🪪" title="Capture owner's ID"
            subtitle="Point camera at DNI, NIE, passport or any ID document"
            scanned={idScanned} scannedText="✓ ID captured — data extracted"
            onClick={!idScanned ? simulateScanID : undefined}
          />

          {idScanned && (
            <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.success, marginBottom: 10 }}>🤖 Extracted from document:</div>
              <div style={{ fontSize: 14, color: C.textMid, marginBottom: 4 }}>👤 {form.owner_name}</div>
              <div style={{ fontSize: 14, color: C.textMid }}>📍 {form.owner_city}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn small onClick={() => setStep(0)} style={{ flex: 1 }}>← Back</Btn>
            <button onClick={() => { setIdScanned(true); setStep(2) }} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
              Skip → fill manually
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Pet photo */}
      {step === 2 && (
        <div>
          <div style={{ background: C.successBg, borderRadius: 14, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.success}` }}>
            <span>📟</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: C.success }}>{chipNumber}</span>
            <span style={{ margin: '0 4px', color: C.textLight }}>·</span>
            <span>👤</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>{form.owner_name || 'Owner'}</span>
          </div>

          <ScanBox
            icon="🐾" title="Take pet photo"
            subtitle="Snap a quick photo of the pet"
            scanned={petPhotoTaken} scannedText="✓ Photo taken!"
            onClick={!petPhotoTaken ? takePhoto : undefined}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn small onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</Btn>
            <button onClick={() => { setPetPhotoTaken(true); setStep(3) }} style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
              Skip photo
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm & complete */}
      {step === 3 && (
        <div>
          <div style={{ background: C.card, borderRadius: 20, padding: 22, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>Confirm & complete</h3>
            <p style={{ fontSize: 12, color: C.textLight, marginBottom: 20 }}>Review and add any missing details</p>

            {/* Chip (read-only) */}
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, marginBottom: 6 }}>MICROCHIP</div>
            <div style={{ padding: '12px 16px', borderRadius: 14, background: C.primaryLight, fontSize: 16, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.primary, marginBottom: 20, letterSpacing: 0.5 }}>
              {chipNumber}
            </div>

            {/* Animal */}
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, marginBottom: 10 }}>🐾 ANIMAL</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['cat', '🐱 Cat'], ['dog', '🐕 Dog'], ['other', '🐾 Other']].map(([v, l]) => (
                <button key={v} onClick={() => updateForm('species', v)} style={{
                  flex: 1, padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif",
                  border: form.species === v ? 'none' : `1.5px solid ${C.border}`,
                  background: form.species === v ? C.primary : C.card,
                  color: form.species === v ? '#fff' : C.text,
                }}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              <input value={form.animal_name} onChange={e => updateForm('animal_name', e.target.value)} placeholder="Pet name *" style={{ padding: '13px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg }} />
              <input value={form.color} onChange={e => updateForm('color', e.target.value)} placeholder="Color / breed" style={{ padding: '13px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['female', '♀ Female'], ['male', '♂ Male']].map(([v, l]) => (
                <button key={v} onClick={() => updateForm('sex', v)} style={{
                  flex: 1, padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif",
                  border: form.sex === v ? 'none' : `1.5px solid ${C.border}`,
                  background: form.sex === v ? C.primary : C.card,
                  color: form.sex === v ? '#fff' : C.text,
                }}>{l}</button>
              ))}
            </div>

            {/* Owner */}
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, marginBottom: 10 }}>👤 OWNER</div>
            {[
              { key: 'owner_name', ph: 'Full name *', icon: '👤' },
              { key: 'owner_phone', ph: 'Phone *', icon: '📞' },
              { key: 'owner_email', ph: 'Email', icon: '📧' },
              { key: 'owner_city', ph: 'City', icon: '📍' },
            ].map(f => (
              <input key={f.key} value={form[f.key]} onChange={e => updateForm(f.key, e.target.value)}
                placeholder={f.ph}
                style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'Nunito',sans-serif", outline: 'none', background: C.bg, marginBottom: 8, boxSizing: 'border-box' }} />
            ))}
          </div>

          <Btn primary full onClick={register} disabled={!chipNumber || !form.animal_name || !form.owner_name}>
            ✅ Register in Pawsy — Free
          </Btn>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Btn small onClick={() => setStep(2)}>← Back</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// SEARCH — Find a chip
// ═══════════════════════════════════════════
function SearchScreen({ showToast }) {
  const [chipNum, setChipNum] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState(false)

  const search = async () => {
    if (!chipNum.trim()) return
    setLoading(true); setResult(null)
    try {
      const res = await searchMicrochip(chipNum.trim())
      if (res.found) { setResult({ found: true, data: res.data }) }
      else {
        const mock = MOCK_CHIPS[chipNum.trim()]
        setResult(mock ? { found: true, data: mock } : { found: false })
      }
    } catch {
      const mock = MOCK_CHIPS[chipNum.trim()]
      setResult(mock ? { found: true, data: mock } : { found: false })
    }
    setLoading(false)
  }

  const simulateScan = () => {
    setChipNum('941000024680135')
    setScanMode(false)
    setTimeout(() => search(), 300)
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>🔍 Search Microchip</h2>
      <p style={{ fontSize: 13, color: C.textLight, marginBottom: 20 }}>Search the Pawsy database and global registries</p>

      {/* Scan button */}
      <button onClick={() => { setScanMode(true); setTimeout(simulateScan, 1200) }} style={{
        width: '100%', padding: '20px', borderRadius: 20, marginBottom: 16,
        background: C.card, border: `2px dashed ${scanMode ? C.primary : C.border}`,
        cursor: 'pointer', textAlign: 'center', fontFamily: "'Nunito',sans-serif",
        transition: 'all 0.3s'
      }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>{scanMode ? '⏳' : '📷'}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: scanMode ? C.primary : C.text }}>
          {scanMode ? 'Scanning...' : 'Scan barcode with camera'}
        </div>
      </button>

      <div style={{ textAlign: 'center', fontSize: 13, color: C.textLight, marginBottom: 16, fontWeight: 700 }}>or type manually</div>

      {/* Manual input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={chipNum} onChange={e => setChipNum(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g., 941000024680135"
          style={{ flex: 1, padding: '16px 18px', borderRadius: 18, border: `2px solid ${C.border}`, fontSize: 16, fontFamily: "'JetBrains Mono',monospace", outline: 'none', background: C.card, boxSizing: 'border-box' }} />
        <Btn primary onClick={search}>{loading ? '...' : '🔍'}</Btn>
      </div>

      {/* Databases */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
        {['Pawsy 🐾', 'REIAC 🇪🇸', 'Europetnet 🇪🇺', 'Animal-ID 🌍'].map((db, i) => (
          <span key={i} style={{ padding: '4px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: i === 0 ? C.primaryLight : C.bg, color: i === 0 ? C.primary : C.textLight, border: `1px solid ${i === 0 ? C.primary : C.border}` }}>{db}</span>
        ))}
      </div>

      {/* Found */}
      {result?.found && (
        <div style={{ background: C.successBg, borderRadius: 24, padding: 24, border: `2px solid ${C.success}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', background: C.success, padding: '5px 14px', borderRadius: 12 }}>✓ FOUND</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 70, height: 70, borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: `2px solid ${C.success}` }}>
              {result.data.species === 'dog' ? '🐕' : '🐱'}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{result.data.animal_name}</div>
              <div style={{ fontSize: 14, color: C.textMid }}>{result.data.color} · {result.data.sex === 'female' ? '♀ Female' : '♂ Male'}</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.success}`, paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.success, marginBottom: 8 }}>OWNER INFORMATION</div>
            {result.data.owner_name && <div style={{ fontSize: 15, color: C.text, marginBottom: 6 }}>👤 {result.data.owner_name}</div>}
            {result.data.owner_city && <div style={{ fontSize: 15, color: C.text, marginBottom: 6 }}>📍 {result.data.owner_city}</div>}
            {result.data.owner_phone && (
              <a href={`tel:${result.data.owner_phone}`} style={{ fontSize: 15, color: C.primary, fontWeight: 800, textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                📞 {result.data.owner_phone}
              </a>
            )}
            {result.data.owner_email && <div style={{ fontSize: 15, color: C.text }}>📧 {result.data.owner_email}</div>}
          </div>
        </div>
      )}

      {/* Not found */}
      {result && !result.found && (
        <div style={{ background: '#FEF3C7', borderRadius: 24, padding: 24, border: '2px solid #FDE68A', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#92400E', marginBottom: 8 }}>Not found in Pawsy</div>
          <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, marginBottom: 16 }}>
            This chip is not in our database yet. Try these external registries:
          </div>
          {[
            { name: 'REIAC', flag: '🇪🇸', desc: 'Spanish national registry' },
            { name: 'Europetnet', flag: '🇪🇺', desc: 'European network' },
            { name: 'Animal-ID.net', flag: '🌍', desc: '117 international registries' },
            { name: 'PetMaxx', flag: '🔗', desc: '32+ registries worldwide' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? `1px solid #FDE68A` : 'none' }}>
              <span style={{ fontSize: 18 }}>{r.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#B45309' }}>{r.desc}</div>
              </div>
              <span style={{ fontSize: 12, color: '#B45309', fontWeight: 800 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
