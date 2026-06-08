import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCats, searchMicrochip, fetchColonies } from './lib/supabase'

// ─── Mock data (fallback when Supabase not configured) ───
const MOCK_CATS = [
  { id: '1', name: 'Luna', age_text: '2 years', age_months: 24, sex: 'female', color: 'Calico', castrated: true, vaccinated: true, microchipped: true, microchip_number: '941000024680135', city: 'Madrid', urgency: 'low', publication_status: 'approved', description: 'Affectionate and playful. Loves laps and gets along with other cats.' },
  { id: '2', name: 'Simba', age_text: '6 months', age_months: 6, sex: 'male', color: 'Orange tabby', castrated: false, vaccinated: true, microchipped: false, city: 'Barcelona', urgency: 'emergency', publication_status: 'approved', description: 'Rescued from the street. Needs urgent home!' },
  { id: '3', name: 'Nala', age_text: '4 years', age_months: 48, sex: 'female', color: 'Black', castrated: true, vaccinated: true, microchipped: true, microchip_number: '941000036791246', city: 'Valencia', urgency: 'low', publication_status: 'approved', description: 'Calm and independent. Ideal for apartments.' },
  { id: '4', name: 'Mochi', age_text: '3 months', age_months: 3, sex: 'male', color: 'White/gray', castrated: false, vaccinated: false, microchipped: false, city: 'Sevilla', urgency: 'high', publication_status: 'approved', description: 'Kitten found abandoned. Very docile.' },
  { id: '5', name: 'Cleo', age_text: '7 years', age_months: 84, sex: 'female', color: 'Siamese', castrated: true, vaccinated: true, microchipped: true, microchip_number: '941000048902357', city: 'Madrid', urgency: 'low', publication_status: 'approved', description: 'Elegant lady looking for a quiet home.' },
  { id: '6', name: 'Thor', age_text: '1 year', age_months: 12, sex: 'male', color: 'Blue gray', castrated: true, vaccinated: true, microchipped: true, microchip_number: '941000059013468', city: 'Bilbao', urgency: 'low', publication_status: 'approved', description: 'Active and curious. Loves to play.' },
]

const MOCK_COLONIES = [
  { id: '1', name: 'Retiro Park — South', estimated_cats: 12, status: 'ok', last_fed_at: new Date(Date.now()-7200000).toISOString() },
  { id: '2', name: 'Calle Mayor 45', estimated_cats: 8, status: 'needs_help', last_fed_at: new Date(Date.now()-86400000).toISOString() },
  { id: '3', name: 'UAM Campus', estimated_cats: 22, status: 'ok', last_fed_at: new Date(Date.now()-10800000).toISOString() },
  { id: '4', name: 'Mercado San Miguel', estimated_cats: 5, status: 'urgent', last_fed_at: new Date(Date.now()-172800000).toISOString() },
]

const MOCK_CHIPS = {
  '941000024680135': { animal_name: 'Luna', species: 'cat', color: 'Calico', sex: 'female', owner_name: 'Ana García', owner_city: 'Madrid', owner_phone: '+34 612 345 678' },
  '941000036791246': { animal_name: 'Nala', species: 'cat', color: 'Black', sex: 'female', owner_name: 'Carlos López', owner_city: 'Valencia' },
  '941000048902357': { animal_name: 'Cleo', species: 'cat', color: 'Siamese', sex: 'female', owner_name: 'María Fdez', owner_city: 'Madrid' },
}

const EMOJIS = ['😻','🐈','🐈‍⬛','😺','😸','🐱','🙀','😹']
const getEmoji = (name) => EMOJIS[name.charCodeAt(0) % EMOJIS.length]

const C = {
  bg: '#FAFAF7', card: '#FFFFFF', primary: '#FF6B4A', primaryDark: '#E0523A',
  primaryLight: '#FFF0EC', secondary: '#1B4332', secondaryLight: '#D8F3DC',
  accent: '#FFB347', text: '#1A1A1A', textMid: '#4A5568', textLight: '#94A3B8',
  border: '#F0EDE8', urgent: '#EF4444', urgentBg: '#FEF2F2', success: '#10B981',
  successBg: '#ECFDF5', info: '#3B82F6', infoBg: '#EFF6FF',
}

const warmColors = ['#FFF8F0','#FEF3C7','#FCE7F3','#EDE9FE','#DBEAFE','#D1FAE5']

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ─── UI Components ───
const Badge = ({ ok, label }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background: ok ? C.successBg : C.primaryLight, color: ok ? C.success : C.primaryDark }}>{ok?'✓':'✗'} {label}</span>
)

const Btn = ({ children, primary, small, full, onClick, style:s }) => (
  <button onClick={onClick} style={{ padding: small?'10px 18px':'14px 28px', borderRadius:16, border: primary?'none':`2px solid ${C.primary}`, fontWeight:800, fontSize: small?13:15, fontFamily:"'Nunito',sans-serif", background: primary?`linear-gradient(135deg,${C.primary},${C.primaryDark})`:'transparent', color: primary?'#fff':C.primary, width: full?'100%':'auto', boxShadow: primary?'0 4px 15px rgba(255,107,74,0.3)':'none', cursor:'pointer', transition:'all 0.2s', ...s }}>{children}</button>
)

const TabBtn = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{ padding:'10px 20px', borderRadius:25, border:'none', fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight: active?800:600, background: active?C.primary:C.card, color: active?'#fff':C.textMid, boxShadow: active?'0 2px 10px rgba(255,107,74,0.25)':'none', cursor:'pointer', transition:'all 0.2s' }}>{children}</button>
)

const Card = ({ children, style:s, onClick }) => (
  <div onClick={onClick} style={{ background:C.card, borderRadius:20, border:`1px solid ${C.border}`, boxShadow:'0 2px 12px rgba(0,0,0,0.04)', cursor: onClick?'pointer':'default', transition:'transform 0.15s', ...s }}>{children}</div>
)

const Section = ({ title, children, action }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
      <h2 style={{ fontSize:20, fontWeight:900, color:C.text, margin:0, fontFamily:"'Playfair Display',serif" }}>{title}</h2>
      {action}
    </div>
    {children}
  </div>
)

// ─── MAIN APP ───
export default function App() {
  const { t, i18n } = useTranslation()
  const [screen, setScreen] = useState('home')
  const [cats, setCats] = useState([])
  const [colonies, setColonies] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [filter, setFilter] = useState('all')
  const [chipSearch, setChipSearch] = useState('')
  const [chipResult, setChipResult] = useState(null)
  const [chipLoading, setChipLoading] = useState(false)
  const [donateAmt, setDonateAmt] = useState(null)
  const [donateType, setDonateType] = useState('one_time')
  const [lostTab, setLostTab] = useState('found')
  const [reportType, setReportType] = useState('found')
  const [toast, setToast] = useState(null)
  const [showLang, setShowLang] = useState(false)
  const [loading, setLoading] = useState(true)

  const showToast = (key) => { setToast(t(`toast.${key}`)); setTimeout(()=>setToast(null), 2200) }
  const go = (s, cat) => { setScreen(s); if(cat) setSelectedCat(cat); window.scrollTo(0,0) }

  const isUrgent = (c) => ['high','emergency'].includes(c.urgency)

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [catsRes, colRes] = await Promise.all([fetchCats(), fetchColonies()])
        setCats(catsRes.data?.length ? catsRes.data : MOCK_CATS)
        setColonies(colRes.data?.length ? colRes.data : MOCK_COLONIES)
      } catch {
        setCats(MOCK_CATS)
        setColonies(MOCK_COLONIES)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleChipSearch = async () => {
    if (!chipSearch.trim()) return
    setChipLoading(true)
    try {
      const res = await searchMicrochip(chipSearch.trim())
      if (res.found) {
        setChipResult({ found: true, data: res.data })
      } else {
        // Try mock data
        const mock = MOCK_CHIPS[chipSearch.trim()]
        setChipResult(mock ? { found: true, data: mock } : { found: false })
      }
    } catch {
      const mock = MOCK_CHIPS[chipSearch.trim()]
      setChipResult(mock ? { found: true, data: mock } : { found: false })
    }
    setChipLoading(false)
  }

  const filteredCats = filter === 'urgent' ? cats.filter(isUrgent) : filter === 'kittens' ? cats.filter(c=>c.age_months<=12) : filter === 'senior' ? cats.filter(c=>c.age_months>=60) : cats

  // ─── SCREENS ───
  const Home = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ background:`linear-gradient(135deg,${C.primary} 0%,#FF8A65 50%,${C.accent} 100%)`, borderRadius:28, padding:'32px 26px', marginBottom:28, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-20, fontSize:100, opacity:0.12, transform:'rotate(20deg)' }}>🐾</div>
        <p style={{ color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:700, letterSpacing:2, margin:'0 0 8px', textTransform:'uppercase' }}>{t('tagline')}</p>
        <h2 style={{ color:'#fff', fontSize:26, fontWeight:900, margin:'0 0 10px', fontFamily:"'Playfair Display',serif", lineHeight:1.2 }}>{t('home.hero_title')}</h2>
        <p style={{ color:'rgba(255,255,255,0.9)', fontSize:13, margin:'0 0 20px', lineHeight:1.6 }}>{t('home.hero_desc')}</p>
        <div style={{ display:'flex', gap:10 }}>
          <Btn primary onClick={()=>go('adopt')} style={{ background:'#fff', color:C.primary, boxShadow:'0 4px 15px rgba(0,0,0,0.1)', fontSize:13, padding:'12px 20px' }}>🐾 {t('nav.adopt')}</Btn>
          <Btn onClick={()=>go('donate')} style={{ border:'2px solid rgba(255,255,255,0.7)', color:'#fff', fontSize:13, padding:'12px 20px' }}>❤️ {t('nav.donate')}</Btn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:28 }}>
        {[{ n:'1.2K', l:t('home.stats.adopted'), i:'🏠' },{ n:'340', l:t('home.stats.volunteers'), i:'🤝' },{ n:'58', l:t('home.stats.colonies'), i:'📍' }].map((s,i) => (
          <Card key={i} style={{ padding:'18px 10px', textAlign:'center' }}>
            <div style={{ fontSize:26 }}>{s.i}</div>
            <div style={{ fontSize:24, fontWeight:900, color:C.primary }}>{s.n}</div>
            <div style={{ fontSize:10, color:C.textLight, fontWeight:700 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      <Section title={t('home.actions.adopt').replace('a Pet','')}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { icon:'🐾', label:t('home.actions.adopt'), target:'adopt', bg:warmColors[0] },
            { icon:'📍', label:t('home.actions.found'), target:'report', bg:warmColors[1] },
            { icon:'🔍', label:t('home.actions.chip'), target:'microchip', bg:warmColors[4] },
            { icon:'😿', label:t('home.actions.lost'), target:'lostFound', bg:warmColors[2] },
            { icon:'🤲', label:t('home.actions.volunteer'), target:'volunteer', bg:warmColors[5] },
            { icon:'🗺️', label:t('home.actions.colonies'), target:'colonies', bg:warmColors[3] },
          ].map((a,i) => (
            <Card key={i} onClick={()=>go(a.target)} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 14px' }}>
              <span style={{ fontSize:28, width:50, height:50, borderRadius:16, background:a.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{a.icon}</span>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>{a.label}</span>
            </Card>
          ))}
        </div>
      </Section>

      <Section title={t('home.urgent')} action={<button onClick={()=>{setFilter('urgent');go('adopt')}} style={{ background:'none', border:'none', color:C.primary, fontWeight:800, fontSize:12, cursor:'pointer' }}>{t('home.see_all')} →</button>}>
        {cats.filter(isUrgent).slice(0,3).map(cat => (
          <Card key={cat.id} onClick={()=>go('catDetail',cat)} style={{ display:'flex', alignItems:'center', gap:14, padding:14, marginBottom:10, background:C.urgentBg, borderColor:'#FECACA' }}>
            <span style={{ fontSize:38, width:58, height:58, borderRadius:18, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center' }}>{getEmoji(cat.name)}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:16, fontWeight:900 }}>{cat.name}</span>
                <span style={{ padding:'2px 8px', borderRadius:8, fontSize:9, fontWeight:900, background:C.urgent, color:'#fff' }}>URGENT</span>
              </div>
              <div style={{ fontSize:12, color:C.textLight }}>{cat.age_text} · {cat.color} · {cat.city}</div>
            </div>
            <span style={{ color:C.textLight, fontSize:20 }}>›</span>
          </Card>
        ))}
      </Section>
    </div>
  )

  const Adopt = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
        {[['all',t('adopt.all')],['urgent','🚨 '+t('adopt.urgent')],['kittens','🐱 '+t('adopt.kittens')],['senior','👴 '+t('adopt.senior')]].map(([k,l])=>(
          <TabBtn key={k} active={filter===k} onClick={()=>setFilter(k)}>{l}</TabBtn>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {filteredCats.map(cat => (
          <Card key={cat.id} onClick={()=>go('catDetail',cat)} style={{ overflow:'hidden', padding:0 }}>
            <div style={{ height:130, background:`linear-gradient(135deg,${C.primaryLight},${warmColors[0]})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:60, position:'relative' }}>
              {getEmoji(cat.name)}
              {isUrgent(cat) && <span style={{ position:'absolute', top:8, right:8, padding:'3px 10px', borderRadius:10, fontSize:9, fontWeight:900, background:C.urgent, color:'#fff' }}>URGENT</span>}
            </div>
            <div style={{ padding:'14px' }}>
              <div style={{ fontSize:16, fontWeight:900, marginBottom:2 }}>{cat.name}</div>
              <div style={{ fontSize:11, color:C.textLight, marginBottom:10 }}>{cat.age_text} · {cat.sex==='male'?'♂':'♀'} · {cat.city}</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {cat.castrated && <Badge ok label={t('adopt.neutered')} />}
                {cat.vaccinated && <Badge ok label={t('adopt.vaccinated')} />}
                {cat.microchipped && <Badge ok label={t('adopt.chipped')} />}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const CatDetail = () => {
    if (!selectedCat) return null
    const c = selectedCat
    return (
      <div style={{ padding:'0 20px 20px' }}>
        <div style={{ height:220, background:`linear-gradient(135deg,${C.primaryLight},${warmColors[0]})`, borderRadius:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:110, marginBottom:24, position:'relative' }}>
          {getEmoji(c.name)}
          {isUrgent(c) && <span style={{ position:'absolute', top:16, right:16, padding:'6px 16px', borderRadius:12, fontSize:12, fontWeight:900, background:C.urgent, color:'#fff' }}>URGENT</span>}
        </div>
        <h2 style={{ fontSize:30, fontWeight:900, margin:0, fontFamily:"'Playfair Display',serif" }}>{c.name}</h2>
        <p style={{ fontSize:13, color:C.textLight, margin:'4px 0 16px', fontWeight:600 }}>📍 {c.city}</p>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
          <Badge ok={c.castrated} label={c.castrated ? t('adopt.neutered') : t('adopt.not_neutered')} />
          <Badge ok={c.vaccinated} label={c.vaccinated ? t('adopt.vaccinated') : t('adopt.not_vaccinated')} />
          <Badge ok={c.microchipped} label={c.microchipped ? t('adopt.chipped') : t('adopt.no_chip')} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
          {[{ l:t('adopt.age'), v:c.age_text },{ l:t('adopt.color'), v:c.color },{ l:t('adopt.sex'), v:c.sex==='male'?t('adopt.male')+' ♂':t('adopt.female')+' ♀' }].map((d,i) => (
            <div key={i} style={{ background:C.bg, borderRadius:16, padding:14, textAlign:'center' }}>
              <div style={{ fontSize:10, color:C.textLight, fontWeight:700, marginBottom:4 }}>{d.l}</div>
              <div style={{ fontSize:14, fontWeight:800 }}>{d.v}</div>
            </div>
          ))}
        </div>
        <Card style={{ padding:20, marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 8px' }}>{t('adopt.about')} {c.name}</h3>
          <p style={{ fontSize:13, lineHeight:1.8, color:C.textMid, margin:0 }}>{c.description}</p>
        </Card>
        {c.microchip_number && (
          <div style={{ background:C.infoBg, borderRadius:16, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:24 }}>📟</span>
            <div>
              <div style={{ fontSize:10, color:C.textLight, fontWeight:700 }}>{t('adopt.microchip')}</div>
              <div style={{ fontSize:15, fontWeight:800, fontFamily:"'JetBrains Mono',monospace" }}>{c.microchip_number}</div>
            </div>
          </div>
        )}
        <Btn primary full onClick={()=>showToast('adopt')}>🐾 {t('adopt.adopt_btn')} {c.name}</Btn>
        <div style={{ marginTop:10 }}><Btn full onClick={()=>showToast('foster')}>🏠 {t('adopt.foster_btn')}</Btn></div>
      </div>
    )
  }

  const Report = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <Section title={t('report.title')}>
        <p style={{ fontSize:13, color:C.textLight, marginTop:-8, marginBottom:20, lineHeight:1.6 }}>{t('report.desc')}</p>
      </Section>
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[['found','🐈 '+t('report.found')],['adopt','🏠 '+t('report.for_adoption')]].map(([k,l])=>(
          <TabBtn key={k} active={reportType===k} onClick={()=>setReportType(k)}>{l}</TabBtn>
        ))}
      </div>
      {[{ l:t('report.location'), p:t('report.location_ph') },{ l:t('report.description'), p:t('report.desc_ph'), multi:true }].map((f,i) => (
        <div key={i} style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, fontWeight:800, display:'block', marginBottom:8 }}>{f.l}</label>
          {f.multi ? <textarea placeholder={f.p} style={{ width:'100%', padding:'14px 18px', borderRadius:16, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"'Nunito',sans-serif", outline:'none', boxSizing:'border-box', background:C.bg, resize:'vertical', minHeight:100 }} />
          : <input placeholder={f.p} style={{ width:'100%', padding:'14px 18px', borderRadius:16, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"'Nunito',sans-serif", outline:'none', boxSizing:'border-box', background:C.bg }} />}
        </div>
      ))}
      <div style={{ border:`2px dashed ${C.border}`, borderRadius:20, padding:'36px 20px', textAlign:'center', marginBottom:20, background:C.card }}>
        <div style={{ fontSize:40, marginBottom:8 }}>📷</div>
        <div style={{ fontSize:13, fontWeight:700, color:C.textMid }}>{t('report.photos')}</div>
        <div style={{ fontSize:11, color:C.textLight, marginTop:4 }}>{t('report.photos_max')}</div>
      </div>
      {reportType==='adopt' && (
        <div style={{ background:'#FEF3C7', borderRadius:16, padding:18, marginBottom:20, border:'1px solid #FDE68A' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#92400E', marginBottom:4 }}>⚠️</div>
          <div style={{ fontSize:12, color:'#92400E', lineHeight:1.6 }}>{t('report.warning')}</div>
        </div>
      )}
      <Btn primary full onClick={()=>showToast('report')}>{t('report.submit')}</Btn>
    </div>
  )

  const LostFound = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <Section title={t('lost.title')} />
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['found','🐈 '+t('lost.found_tab')],['lost','😿 '+t('lost.lost_tab')]].map(([k,l])=>(
          <TabBtn key={k} active={lostTab===k} onClick={()=>setLostTab(k)}>{l}</TabBtn>
        ))}
      </div>
      {(lostTab==='found' ? [
        { emoji:'🐈', desc:'Tabby cat near Plaza Mayor', loc:'Madrid Centro', time:'2h' },
        { emoji:'😺', desc:'White kitten near metro', loc:'Callao', time:'5h' },
        { emoji:'🐕', desc:'Small brown dog, no collar', loc:'Lavapiés', time:'1d' },
      ] : [
        { emoji:'😿', desc:'Luna, siamese, escaped', loc:'Chamberí', time:'1d' },
        { emoji:'🙀', desc:'Milo, orange, blue collar', loc:'Salamanca', time:'3d' },
      ]).map((item,i) => (
        <Card key={i} style={{ display:'flex', gap:14, padding:16, marginBottom:10 }}>
          <span style={{ fontSize:34, width:56, height:56, borderRadius:16, background: lostTab==='lost'?'#FEE2E2':C.secondaryLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{item.emoji}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:4, lineHeight:1.4 }}>{item.desc}</div>
            <div style={{ fontSize:11, color:C.textLight, fontWeight:600 }}>📍 {item.loc} · ⏱ {item.time}</div>
          </div>
        </Card>
      ))}
      <Btn primary full onClick={()=>go('report')} style={{ marginTop:10 }}>
        {lostTab==='lost' ? '😿 '+t('lost.report_lost') : '🐈 '+t('lost.report_found')}
      </Btn>
    </div>
  )

  const Volunteer = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <Section title={t('volunteer.title')}>
        <p style={{ fontSize:13, color:C.textLight, marginTop:-8, marginBottom:20, lineHeight:1.6 }}>{t('volunteer.desc')}</p>
      </Section>
      {['foster','feeder','transport','photo','collector','social'].map((k,i) => (
        <Card key={k} onClick={()=>showToast('volunteer')} style={{ display:'flex', alignItems:'center', gap:14, padding:16, marginBottom:10 }}>
          <span style={{ fontSize:30, width:56, height:56, borderRadius:18, background:warmColors[i], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{['🏠','🍽️','🚗','📸','🛒','📱'][i]}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:900, marginBottom:3 }}>{t(`volunteer.types.${k}`)}</div>
            <div style={{ fontSize:11, color:C.textLight, lineHeight:1.5 }}>{t(`volunteer.types.${k}_desc`)}</div>
          </div>
        </Card>
      ))}
    </div>
  )

  const Colonies = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <Section title={t('colonies.title')}>
        <p style={{ fontSize:13, color:C.textLight, marginTop:-8, marginBottom:20, lineHeight:1.6 }}>{t('colonies.desc')}</p>
      </Section>
      <div style={{ height:180, borderRadius:24, marginBottom:24, background:'linear-gradient(135deg,#D1FAE5,#A7F3D0,#6EE7B7)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {['📍','📍','📍','📍'].map((p,i) => (
          <span key={i} style={{ position:'absolute', fontSize:26, top:[45,75,35,110][i], left:[55,155,235,125][i], filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.2))', color:[C.success,C.accent,C.success,C.urgent][i] }}>{p}</span>
        ))}
        <span style={{ fontSize:13, fontWeight:800, color:C.secondary, background:'rgba(255,255,255,0.9)', padding:'10px 20px', borderRadius:14, boxShadow:'0 2px 10px rgba(0,0,0,0.1)' }}>🗺️ {t('colonies.view_map')}</span>
      </div>
      {colonies.map((col,i) => (
        <Card key={col.id} style={{ padding:18, marginBottom:10, borderColor: col.status==='urgent'?'#FECACA':C.border }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div style={{ fontSize:14, fontWeight:900, flex:1, lineHeight:1.3 }}>{col.name}</div>
            <span style={{ padding:'4px 12px', borderRadius:10, fontSize:10, fontWeight:800, flexShrink:0, background: col.status==='ok'?C.successBg:col.status==='urgent'?C.urgentBg:'#FEF3C7', color: col.status==='ok'?C.success:col.status==='urgent'?C.urgent:'#D97706' }}>
              {col.status==='ok'?'✓ '+t('colonies.ok'):col.status==='urgent'?'⚠ '+t('colonies.urgent'):t('colonies.needs_help')}
            </span>
          </div>
          <div style={{ display:'flex', gap:16, fontSize:12, color:C.textLight, fontWeight:600, marginBottom:6 }}>
            <span>🐱 {col.estimated_cats} {t('colonies.cats')}</span>
          </div>
          <div style={{ fontSize:11, color:C.textLight }}>{t('colonies.last_fed')}: {timeAgo(col.last_fed_at)}</div>
          <Btn small onClick={()=>showToast('colony')} style={{ marginTop:12, fontSize:12 }}>{t('colonies.help')}</Btn>
        </Card>
      ))}
    </div>
  )

  const Donate = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ background:`linear-gradient(135deg,${C.secondary},#40916C)`, borderRadius:24, padding:28, marginBottom:28, color:'#fff' }}>
        <p style={{ fontSize:12, letterSpacing:2, opacity:0.8, margin:'0 0 6px', fontWeight:700, textTransform:'uppercase' }}>{t('donate.hero_sub')}</p>
        <h2 style={{ fontSize:22, fontWeight:900, margin:0, fontFamily:"'Playfair Display',serif", lineHeight:1.3 }}>{t('donate.hero')}</h2>
      </div>
      <Section title={t('donate.amount')}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[5,10,25,50,100,t('donate.other')].map(a => (
            <button key={a} onClick={()=>setDonateAmt(a)} style={{ padding:'18px 10px', borderRadius:16, fontFamily:"'Nunito',sans-serif", fontSize:typeof a==='number'?20:13, fontWeight:900, background:donateAmt===a?C.primary:C.card, color:donateAmt===a?'#fff':C.text, border:donateAmt===a?'none':`1.5px solid ${C.border}`, cursor:'pointer', boxShadow:donateAmt===a?'0 4px 15px rgba(255,107,74,0.3)':'none', transition:'all 0.2s' }}>{typeof a==='number'?`€${a}`:a}</button>
          ))}
        </div>
      </Section>
      <Section title={t('donate.frequency')}>
        <div style={{ display:'flex', gap:10 }}>
          {[['one_time','💰 '+t('donate.one_time')],['monthly','🔄 '+t('donate.monthly')]].map(([k,l]) => (
            <div key={k} onClick={()=>setDonateType(k)} style={{ flex:1, padding:16, borderRadius:16, textAlign:'center', cursor:'pointer', background:donateType===k?C.secondaryLight:C.card, border:`1.5px solid ${donateType===k?C.secondary:C.border}`, transition:'all 0.2s' }}>
              <div style={{ fontSize:14, fontWeight:800 }}>{l}</div>
            </div>
          ))}
        </div>
      </Section>
      <Card style={{ padding:18, marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>{t('donate.covers')}</div>
        {[5,10,25,50,100].map((a,i) => (
          <div key={a} style={{ display:'flex', gap:12, marginBottom:8, alignItems:'center' }}>
            <span style={{ padding:'4px 10px', borderRadius:10, fontSize:12, fontWeight:900, background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, color:'#fff', minWidth:42, textAlign:'center' }}>€{a}</span>
            <span style={{ fontSize:12, color:C.textMid }}>{t(`donate.items.${i}`)}</span>
          </div>
        ))}
      </Card>
      <Btn primary full onClick={()=>showToast('donate')}>❤️ {t('donate.donate_btn')} {donateAmt&&typeof donateAmt==='number'?`€${donateAmt}`:''}</Btn>
    </div>
  )

  const Microchip = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <Section title={t('chip.title')}>
        <p style={{ fontSize:13, color:C.textLight, marginTop:-8, marginBottom:4, lineHeight:1.6 }}>{t('chip.desc')}</p>
      </Section>
      <Card style={{ padding:22, marginBottom:20 }}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={chipSearch} onChange={e=>setChipSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChipSearch()} placeholder="e.g., 941000024680135" style={{ flex:1, padding:'14px 18px', borderRadius:16, border:`1.5px solid ${C.border}`, fontSize:15, fontFamily:"'JetBrains Mono',monospace", outline:'none', background:C.bg, boxSizing:'border-box' }} />
          <Btn primary small onClick={handleChipSearch}>{chipLoading?'...':'🔍'}</Btn>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
          {['Pawsy DB','REIAC','Europetnet','WorldPetNet','AAHA','PetMaxx'].map((db,i) => (
            <span key={i} style={{ padding:'4px 10px', borderRadius:10, fontSize:10, fontWeight:700, background:i===0?C.primaryLight:C.bg, color:i===0?C.primary:C.textLight, border:`1px solid ${i===0?C.primary:C.border}` }}>{db}</span>
          ))}
        </div>
        {chipResult?.found && (
          <div style={{ background:C.successBg, borderRadius:16, padding:18, marginTop:16, border:`1px solid ${C.success}` }}>
            <span style={{ fontSize:10, fontWeight:800, color:'#fff', background:C.success, padding:'4px 12px', borderRadius:10 }}>✓ {t('chip.found')}</span>
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:18, fontWeight:900 }}>{chipResult.data.animal_name}</div>
              <div style={{ fontSize:12, color:C.textMid }}>{chipResult.data.color} · {chipResult.data.sex==='female'?'♀':'♂'}</div>
              {chipResult.data.owner_name && <div style={{ fontSize:12, color:C.textMid, marginTop:4 }}>👤 {chipResult.data.owner_name}</div>}
              {chipResult.data.owner_city && <div style={{ fontSize:12, color:C.textMid }}>📍 {chipResult.data.owner_city}</div>}
              {chipResult.data.owner_phone && <div style={{ fontSize:12, color:C.textMid }}>📞 {chipResult.data.owner_phone}</div>}
            </div>
          </div>
        )}
        {chipResult && !chipResult.found && (
          <div style={{ background:C.urgentBg, borderRadius:16, padding:18, marginTop:16, border:'1px solid #FECACA' }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.urgent, marginBottom:6 }}>{t('chip.not_found')}</div>
            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:12 }}>{t('chip.not_found_desc')}</div>
            <Btn small primary onClick={()=>showToast('chip_register')}>{t('chip.register')}</Btn>
          </div>
        )}
      </Card>
      <Section title={t('chip.external')}>
        {[{ name:'REIAC', desc:'Spain 🇪🇸', flag:'🇪🇸' },{ name:'Europetnet', desc:'Europe 🇪🇺', flag:'🇪🇺' },{ name:'WorldPetNet', desc:'Global 🌍', flag:'🌍' },{ name:'AAHA', desc:'USA 🇺🇸', flag:'🇺🇸' },{ name:'PetMaxx', desc:'32+ registries', flag:'🔗' }].map((r,i) => (
          <Card key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:14, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{r.flag}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800 }}>{r.name}</div>
              <div style={{ fontSize:11, color:C.textLight }}>{r.desc}</div>
            </div>
            <span style={{ fontSize:12, color:C.primary, fontWeight:800 }}>{t('chip.search')} →</span>
          </Card>
        ))}
      </Section>
      <Card style={{ padding:18, background:C.infoBg, borderColor:'#BFDBFE' }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#1E40AF', marginBottom:6 }}>💡 {t('chip.register_own')}</div>
        <div style={{ fontSize:12, color:'#3B82F6', lineHeight:1.6 }}>{t('chip.register_tip')}</div>
      </Card>
    </div>
  )

  const Profile = () => (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:90, height:90, borderRadius:'50%', margin:'0 auto 14px', background:`linear-gradient(135deg,${C.primary},${C.accent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:42, boxShadow:'0 6px 20px rgba(255,107,74,0.3)' }}>😺</div>
        <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Playfair Display',serif" }}>Guest User</div>
        <div style={{ fontSize:13, color:C.textLight, fontWeight:600, marginTop:2 }}>Pawsy v1.0 MVP</div>
      </div>
      <Card style={{ padding:16, marginBottom:10 }} onClick={()=>setShowLang(!showLang)}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:24 }}>🌐</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800 }}>{t('profile.language')}</div>
            <div style={{ fontSize:11, color:C.textLight }}>{i18n.language==='en'?'English':i18n.language==='es'?'Español':'Português'}</div>
          </div>
          <span style={{ color:C.textLight }}>{showLang?'▴':'▾'}</span>
        </div>
        {showLang && (
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            {[['en','🇬🇧 EN'],['es','🇪🇸 ES'],['pt','🇧🇷 PT']].map(([k,l]) => (
              <button key={k} onClick={e=>{e.stopPropagation();i18n.changeLanguage(k);setShowLang(false)}} style={{ flex:1, padding:10, borderRadius:12, border:i18n.language===k?'none':`1px solid ${C.border}`, background:i18n.language===k?C.primary:C.card, color:i18n.language===k?'#fff':C.text, fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>{l}</button>
            ))}
          </div>
        )}
      </Card>
      {[
        { icon:'🐾', l:t('profile.my_pets'), d:'3 registered' },
        { icon:'🏠', l:t('profile.foster_care'), d:'1 in foster' },
        { icon:'💝', l:t('profile.my_donations'), d:'€120' },
        { icon:'🔔', l:t('profile.notifications'), d:'2 new' },
        { icon:'⚙️', l:t('profile.settings'), d:'Account' },
        { icon:'ℹ️', l:t('profile.about'), d:'v1.0' },
      ].map((item,i) => (
        <Card key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:16, marginBottom:8 }}>
          <span style={{ fontSize:24 }}>{item.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800 }}>{item.l}</div>
            <div style={{ fontSize:11, color:C.textLight }}>{item.d}</div>
          </div>
          <span style={{ color:C.textLight }}>›</span>
        </Card>
      ))}
    </div>
  )

  const screens = { home:Home, adopt:Adopt, catDetail:CatDetail, report:Report, lostFound:LostFound, volunteer:Volunteer, colonies:Colonies, donate:Donate, microchip:Microchip, profile:Profile }
  const titles = { adopt:t('adopt.title'), catDetail:t('adopt.title'), report:t('report.title'), lostFound:t('lost.title'), volunteer:t('volunteer.title'), colonies:t('colonies.title'), donate:t('donate.title'), microchip:t('chip.title'), profile:t('profile.title') }
  const Screen = screens[screen] || Home

  return (
    <div style={{ width:'100%', maxWidth:393, minHeight:'100vh', background:C.bg, position:'relative', display:'flex', flexDirection:'column', boxShadow:'0 0 60px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px 8px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, background:C.bg, zIndex:50 }}>
        {screen!=='home' && (
          <button onClick={()=>go(screen==='catDetail'?'adopt':'home')} style={{ background:C.card, border:`1px solid ${C.border}`, fontSize:18, padding:'8px 12px', borderRadius:14, cursor:'pointer' }}>←</button>
        )}
        <div style={{ flex:1 }}>
          {screen==='home' ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:14, background:`linear-gradient(135deg,${C.primary},${C.accent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 3px 10px rgba(255,107,74,0.3)' }}>🐾</div>
              <div>
                <div style={{ fontSize:20, fontWeight:900, fontFamily:"'Playfair Display',serif", letterSpacing:-0.5 }}>{t('brand')}</div>
                <div style={{ fontSize:10, color:C.textLight, fontWeight:600 }}>{t('tagline')}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:20, fontWeight:900, fontFamily:"'Playfair Display',serif" }}>{titles[screen]}</div>
          )}
        </div>
        <button onClick={()=>go('profile')} style={{ width:40, height:40, borderRadius:14, border:`1px solid ${C.border}`, background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, cursor:'pointer' }}>😺</button>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:80 }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:48 }}>🐾</div>
            <div style={{ fontSize:14, color:C.textLight, fontWeight:600 }}>Loading Pawsy...</div>
          </div>
        ) : <Screen />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:393, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', padding:'6px 12px 24px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:`1px solid ${C.border}`, zIndex:50 }}>
        {[['home','🏠',t('nav.home')],['adopt','🐾',t('nav.adopt')],['report','📍',t('nav.report')],['microchip','🔍',t('nav.chip')],['donate','❤️',t('nav.donate')]].map(([tgt,i,l]) => (
          <button key={tgt} onClick={()=>go(tgt)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', padding:'6px 0', color:screen===tgt?C.primary:C.textLight, fontFamily:"'Nunito',sans-serif", cursor:'pointer', position:'relative' }}>
            {screen===tgt && <div style={{ position:'absolute', top:-1, width:20, height:3, borderRadius:2, background:C.primary }} />}
            <span style={{ fontSize:22 }}>{i}</span>
            <span style={{ fontSize:10, fontWeight:screen===tgt?900:600 }}>{l}</span>
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:'40%', left:'50%', transform:'translate(-50%,-50%)', background:'rgba(27,67,50,0.95)', color:'#fff', padding:'22px 36px', borderRadius:24, textAlign:'center', zIndex:100, boxShadow:'0 15px 50px rgba(0,0,0,0.25)' }}>
          <div style={{ fontSize:16, fontWeight:800 }}>{toast}</div>
        </div>
      )}
    </div>
  )
}
