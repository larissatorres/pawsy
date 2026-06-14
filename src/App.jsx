import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase, signInWithGoogle, signOut, onAuthChange, searchMicrochip,
  registerMicrochip, getMyPets, updatePet, deletePet, uploadPhoto } from './lib/supabase'

const C = {
  bg:'#FAFAF7',card:'#FFF',primary:'#FF6B4A',primaryDark:'#E0523A',primaryLight:'#FFF0EC',
  secondary:'#1B4332',secondaryLight:'#D8F3DC',accent:'#FFB347',text:'#1A1A1A',
  textMid:'#4A5568',textLight:'#94A3B8',border:'#F0EDE8',success:'#10B981',successBg:'#ECFDF5',
  info:'#3B82F6',infoBg:'#EFF6FF',urgent:'#EF4444',vet:'#7C3AED',vetBg:'#F5F3FF',
  shelter:'#0891B2',shelterBg:'#ECFEFF',
}

const Btn=({children,primary,full,small,disabled,onClick,style:s})=>(
  <button onClick={disabled?undefined:onClick} style={{padding:small?'11px 18px':'15px 26px',borderRadius:18,fontWeight:800,fontSize:small?13:15,fontFamily:"'Nunito',sans-serif",cursor:disabled?'default':'pointer',border:primary?'none':`2px solid ${C.primary}`,background:primary?(disabled?'#ccc':`linear-gradient(135deg,${C.primary},${C.primaryDark})`):'transparent',color:primary?'#fff':C.primary,width:full?'100%':'auto',boxShadow:primary&&!disabled?'0 4px 18px rgba(255,107,74,0.25)':'none',opacity:disabled?0.5:1,transition:'all 0.2s',...s}}>{children}</button>
)

const Steps=({c,t})=><div style={{display:'flex',gap:6,marginBottom:24}}>{Array.from({length:t},(_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=c?C.primary:C.border,transition:'all 0.4s'}}/>)}</div>

function Scanner({onScan,onClose}){
  const ref=useRef(null)
  useEffect(()=>{
    let q,m=true
    ;(async()=>{try{q=new Html5Qrcode('br');await q.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:120}},t=>{if(m){onScan(t);try{q.stop()}catch{}}},()=>{})}catch{if(m)onClose()}})()
    return()=>{m=false;try{q?.stop()}catch{}}
  },[])
  return <div style={{position:'relative'}}><div id="br" style={{width:'100%',borderRadius:20,overflow:'hidden',minHeight:250,background:'#000'}}/><button onClick={onClose} style={{position:'absolute',top:12,right:12,background:'rgba(0,0,0,0.6)',color:'#fff',border:'none',borderRadius:'50%',width:36,height:36,fontSize:18,cursor:'pointer'}}>✕</button></div>
}

// ═══ MAIN APP ═══
export default function App(){
  const[user,setUser]=useState(null)
  const[loading,setLoading]=useState(true)
  const[screen,setScreen]=useState('home')
  const[role,setRole]=useState(null)
  const[vetOk,setVetOk]=useState(false)
  const[toast,setToast]=useState(null)
  const[editPet,setEditPet]=useState(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user||null);setLoading(false)})
    const{data:{subscription}}=onAuthChange(u=>setUser(u))
    return()=>subscription.unsubscribe()
  },[])

  const show=m=>{setToast(m);setTimeout(()=>setToast(null),2500)}
  const go=s=>{setScreen(s);window.scrollTo?.(0,0)}

  if(loading)return<Wrap><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12}}><div style={{fontSize:48}}>🐾</div><div style={{fontSize:14,color:C.textLight}}>Loading Pawsy...</div></div></Wrap>

  return(
    <Wrap>
      <Header user={user} role={role} screen={screen} go={go}/>
      <div style={{flex:1,overflowY:'auto',paddingBottom:20}}>
        {!user && screen!=='search' ? <LoginScreen/> :
         screen==='home' ? <Home setRole={r=>{setRole(r);go(r==='vet'&&!vetOk?'vetVerify':'dash')}} user={user} go={go}/> :
         screen==='vetVerify' ? <VetVerify done={()=>{setVetOk(true);go('dash')}}/> :
         screen==='dash' ? <Dash role={role} go={go} setRole={setRole}/> :
         screen==='register' ? <Register role={role} user={user} show={show} back={()=>go('dash')}/> :
         screen==='search' ? <Search role={role} user={user} show={show}/> :
         screen==='profile' ? <Profile user={user} go={go} show={show} setEdit={p=>{setEditPet(p);go('edit')}}/> :
         screen==='edit' ? <EditPetScreen pet={editPet} show={show} back={()=>go('profile')}/> :
         screen==='settings' ? <Settings user={user} go={go}/> :
         <Home setRole={r=>{setRole(r);go('dash')}} user={user} go={go}/>
        }
      </div>
      {toast&&<div style={{position:'fixed',top:'40%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(27,67,50,0.95)',color:'#fff',padding:'20px 32px',borderRadius:22,textAlign:'center',zIndex:100,boxShadow:'0 15px 50px rgba(0,0,0,0.25)',maxWidth:300}}><div style={{fontSize:15,fontWeight:800}}>{toast}</div></div>}
    </Wrap>
  )
}

function Wrap({children}){return(
  <div style={{width:'100%',maxWidth:420,minHeight:'100vh',background:C.bg,position:'relative',display:'flex',flexDirection:'column',boxShadow:'0 0 60px rgba(0,0,0,0.08)',margin:'0 auto',fontFamily:"'Nunito',sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"/>
    {children}
  </div>
)}

function Header({user,role,screen,go}){
  const R={vet:{l:'Vet',c:C.vet,b:C.vetBg},shelter:{l:'Shelter',c:C.shelter,b:C.shelterBg},public:{l:'Public',c:C.info,b:C.infoBg}}
  return(
  <div style={{padding:'14px 20px 10px',display:'flex',alignItems:'center',gap:10,background:C.bg,position:'sticky',top:0,zIndex:50,borderBottom:`1px solid ${C.border}`}}>
    {!['home',''].includes(screen)&&<button onClick={()=>go(screen==='dash'?'home':screen==='edit'?'profile':'dash')} style={{background:C.card,border:`1px solid ${C.border}`,fontSize:16,padding:'7px 11px',borderRadius:12,cursor:'pointer'}}>←</button>}
    <div style={{width:34,height:34,borderRadius:11,background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 3px 10px rgba(255,107,74,0.25)'}}>🐾</div>
    <div style={{flex:1}}><div style={{fontSize:17,fontWeight:900,fontFamily:"'Playfair Display',serif"}}>Pawsy</div><div style={{fontSize:9,color:C.textLight,fontWeight:600}}>Global Pet Microchip Registry</div></div>
    {role&&R[role]&&<div style={{padding:'4px 10px',borderRadius:10,fontSize:10,fontWeight:800,background:R[role].b,color:R[role].c}}>{R[role].l}</div>}
    {user&&<button onClick={()=>go('profile')} style={{width:34,height:34,borderRadius:'50%',border:'none',cursor:'pointer',overflow:'hidden',background:C.border,padding:0}}>
      {user.user_metadata?.avatar_url?<img src={user.user_metadata.avatar_url} style={{width:34,height:34,borderRadius:'50%'}} referrerPolicy="no-referrer"/>:<span style={{fontSize:16}}>👤</span>}
    </button>}
  </div>)
}

// ═══ LOGIN ═══
function LoginScreen(){
  return(
  <div style={{padding:'60px 20px',textAlign:'center'}}>
    <div style={{fontSize:64,marginBottom:16}}>🐾</div>
    <h1 style={{fontSize:28,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:8}}>Pawsy</h1>
    <p style={{fontSize:14,color:C.textLight,marginBottom:40,lineHeight:1.6}}>Free Global Pet Microchip Registry<br/>Scan. Register. Protect.</p>
    <Btn primary full onClick={signInWithGoogle} style={{fontSize:16,padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
      <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.003 24.003 0 000 21.56l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Sign in with Google
    </Btn>
    <p style={{fontSize:11,color:C.textLight,marginTop:20,lineHeight:1.6}}>By signing in you agree to Pawsy's<br/>Terms of Service and Privacy Policy</p>
  </div>)
}

// ═══ HOME ═══
function Home({setRole,user,go}){
  return(
  <div style={{padding:'0 20px'}}>
    <div style={{background:`linear-gradient(135deg,${C.primary} 0%,#FF8A65 50%,${C.accent} 100%)`,borderRadius:26,padding:'34px 24px',marginBottom:24,position:'relative',overflow:'hidden',textAlign:'center'}}>
      <div style={{position:'absolute',top:-30,right:-20,fontSize:90,opacity:0.12,transform:'rotate(20deg)'}}>🐾</div>
      <div style={{fontSize:44,marginBottom:10}}>📟</div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,margin:'0 0 6px',fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>Free Global Pet<br/>Microchip Registry</h1>
      <p style={{color:'rgba(255,255,255,0.85)',fontSize:13,margin:0}}>Scan. Register. Protect.</p>
    </div>

    {user&&<div style={{marginBottom:16}}><div style={{fontSize:15,fontWeight:800,marginBottom:14}}>I want to...</div>
    {[{r:'vet',icon:'🩺',t:'Register chips (Vet)',c:C.vet,b:C.vetBg,bo:'#C4B5FD'},
      {r:'shelter',icon:'🏠',t:'Register rescued pets',c:C.shelter,b:C.shelterBg,bo:'#A5F3FC'},
      {r:'public',icon:'👤',t:'Search or register my pet',c:C.info,b:C.infoBg,bo:'#BFDBFE'},
    ].map(r=><button key={r.r} onClick={()=>setRole(r.r)} style={{display:'flex',alignItems:'center',gap:14,padding:'18px 16px',width:'100%',background:C.card,borderRadius:20,border:`2px solid ${r.bo}`,cursor:'pointer',textAlign:'left',fontFamily:"'Nunito',sans-serif",marginBottom:10,boxShadow:'0 3px 14px rgba(0,0,0,0.04)'}}>
      <div style={{width:50,height:50,borderRadius:16,background:r.b,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{r.icon}</div>
      <div style={{flex:1,fontSize:15,fontWeight:800,color:r.c}}>{r.t}</div>
      <span style={{color:C.textLight,fontSize:18}}>›</span>
    </button>)}
    </div>}

    {/* Quick search without login */}
    <button onClick={()=>go('search')} style={{display:'flex',alignItems:'center',gap:14,padding:'18px 16px',width:'100%',background:C.card,borderRadius:20,border:`2px solid #BFDBFE`,cursor:'pointer',textAlign:'left',fontFamily:"'Nunito',sans-serif",marginBottom:20,boxShadow:'0 3px 14px rgba(0,0,0,0.04)'}}>
      <div style={{width:50,height:50,borderRadius:16,background:C.infoBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔍</div>
      <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:C.info}}>Search Microchip</div><div style={{fontSize:11,color:C.textLight}}>No login required</div></div>
      <span style={{color:C.textLight,fontSize:18}}>›</span>
    </button>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
      {[{n:'5.8K',l:'Registered',i:'📟'},{n:'117',l:'Registries',i:'🌍'},{n:'€0',l:'Forever',i:'💚'}].map((s,i)=><div key={i} style={{background:C.card,borderRadius:14,padding:'14px 8px',textAlign:'center',border:`1px solid ${C.border}`}}><div style={{fontSize:18}}>{s.i}</div><div style={{fontSize:18,fontWeight:900,color:C.primary}}>{s.n}</div><div style={{fontSize:9,color:C.textLight,fontWeight:700}}>{s.l}</div></div>)}
    </div>
  </div>)
}

// ═══ VET VERIFY ═══
function VetVerify({done}){
  const[f,sF]=useState({clinic:'',license:'',city:''})
  const[ok,sO]=useState(false)
  return(
  <div style={{padding:'0 20px'}}>
    <div style={{textAlign:'center',marginBottom:20}}><div style={{fontSize:44,marginBottom:8}}>🩺</div><h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif"}}>Vet Verification</h2><p style={{fontSize:12,color:C.textLight}}>Quick verification for professional access</p></div>
    <div style={{background:C.card,borderRadius:18,padding:18,border:`1px solid ${C.border}`,marginBottom:16}}>
      {[{k:'clinic',l:'Clinic name',p:'e.g., Clínica Veterinaria Madrid'},{k:'license',l:'License number',p:'Colegiado nº'},{k:'city',l:'City',p:'e.g., Madrid'}].map(x=><div key={x.k} style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:800,display:'block',marginBottom:5}}>{x.l}</label><input value={f[x.k]} onChange={e=>sF({...f,[x.k]:e.target.value})} placeholder={x.p} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:'none',background:C.bg,boxSizing:'border-box'}}/></div>)}
      <div onClick={()=>sO(!ok)} style={{display:'flex',gap:10,cursor:'pointer',padding:'10px 0'}}>
        <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${ok?C.success:C.border}`,background:ok?C.success:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13,fontWeight:900,flexShrink:0}}>{ok?'✓':''}</div>
        <div style={{fontSize:11,color:C.textMid,lineHeight:1.5}}>I confirm I am a licensed veterinary professional and agree to handle data responsibly under GDPR.</div>
      </div>
    </div>
    <Btn primary full disabled={!f.clinic||!f.license||!ok} onClick={done}>✅ Verify & Continue</Btn>
  </div>)
}

// ═══ DASHBOARD ═══
function Dash({role,go,setRole}){
  return(
  <div style={{padding:'0 20px'}}>
    <h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:4}}>{role==='vet'?'🩺 Vet':role==='shelter'?'🏠 Shelter':'👤 My'} Dashboard</h2>
    <p style={{fontSize:12,color:C.textLight,marginBottom:20}}>Register and search microchips</p>
    {['register','search','profile'].map(s=>(
      <button key={s} onClick={()=>go(s)} style={{display:'flex',alignItems:'center',gap:14,padding:'20px 18px',width:'100%',background:C.card,borderRadius:20,border:`1px solid ${C.border}`,cursor:'pointer',textAlign:'left',fontFamily:"'Nunito',sans-serif",marginBottom:10,boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
        <div style={{width:50,height:50,borderRadius:16,background:s==='register'?C.secondaryLight:s==='search'?C.infoBg:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{s==='register'?'📷':s==='search'?'🔍':'👤'}</div>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>{s==='register'?'Register Microchip':s==='search'?'Search Microchip':'My Profile & Pets'}</div><div style={{fontSize:11,color:C.textLight}}>{s==='register'?'Scan → Register → Done':s==='search'?'Find pet/owner info':'View & edit your registrations'}</div></div>
        <span style={{color:C.textLight,fontSize:18}}>›</span>
      </button>
    ))}
    <button onClick={()=>{setRole(null);go('home')}} style={{background:'none',border:'none',color:C.primary,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:"'Nunito',sans-serif",display:'block',margin:'16px auto 0'}}>← Switch role</button>
  </div>)
}

// ═══ REGISTER ═══
function Register({role,user,show,back}){
  const[step,setStep]=useState(0)
  const[chip,setChip]=useState('')
  const[scanned,setScanned]=useState(false)
  const[scanning,setScanning]=useState(false)
  const[manual,setManual]=useState(false)
  const[photoFile,setPhotoFile]=useState(null)
  const[photoPreview,setPhotoPreview]=useState(null)
  const[gdpr,setGdpr]=useState(false)
  const[done,setDone]=useState(false)
  const[saving,setSaving]=useState(false)
  const[form,setForm]=useState({animal_name:'',species:'cat',color:'',sex:'unknown',owner_name:'',owner_phone:'',owner_email:'',owner_city:''})
  const fileRef=useRef()
  const u=(k,v)=>setForm(p=>({...p,[k]:v}))

  const onScan=t=>{setChip(t);setScanned(true);setScanning(false);setTimeout(()=>setStep(1),600)}

  const handlePhoto=e=>{
    const f=e.target.files?.[0]
    if(f){setPhotoFile(f);const r=new FileReader();r.onload=x=>setPhotoPreview(x.target.result);r.readAsDataURL(f)}
  }

  const register=async()=>{
    setSaving(true)
    let photoUrl=null
    if(photoFile&&user){try{photoUrl=await uploadPhoto(photoFile,user.id)}catch{}}
    const data={chip_number:chip,species:form.species,animal_name:form.animal_name,color:form.color,sex:form.sex,owner_name:form.owner_name,owner_phone:form.owner_phone,owner_email:form.owner_email,owner_city:form.owner_city,owner_country:'ES',photo_url:photoUrl,registered_by_auth:user?.id}
    await registerMicrochip(data)
    setDone(true);setSaving(false);show('✅ Registered in Pawsy!')
  }

  if(done)return(
    <div style={{padding:'40px 20px',textAlign:'center'}}>
      <div style={{width:90,height:90,borderRadius:'50%',background:C.successBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:44,margin:'0 auto 20px',border:`3px solid ${C.success}`}}>✅</div>
      <h2 style={{fontSize:22,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:12}}>Registered!</h2>
      <div style={{background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}`,textAlign:'left',marginBottom:20}}>
        {photoPreview&&<img src={photoPreview} style={{width:'100%',height:120,objectFit:'cover',borderRadius:12,marginBottom:12}}/>}
        <div style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:C.primary,background:C.primaryLight,padding:'8px 12px',borderRadius:10,marginBottom:10,fontWeight:700}}>📟 {chip}</div>
        <div style={{fontSize:15,fontWeight:900}}>{form.animal_name}</div>
        <div style={{fontSize:12,color:C.textMid}}>👤 {form.owner_name} · 📍 {form.owner_city}</div>
      </div>
      <Btn primary full onClick={()=>{setDone(false);setStep(0);setChip('');setScanned(false);setPhotoFile(null);setPhotoPreview(null);setGdpr(false);setManual(false);setForm({animal_name:'',species:'cat',color:'',sex:'unknown',owner_name:'',owner_phone:'',owner_email:'',owner_city:''})}}>📷 Register another</Btn>
      <button onClick={back} style={{background:'none',border:'none',color:C.primary,fontWeight:700,fontSize:13,marginTop:14,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>← Dashboard</button>
    </div>)

  return(
  <div style={{padding:'0 20px'}}>
    <h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:16}}>Register Microchip</h2>
    <Steps c={step} t={4}/>

    {step===0&&<div>
      {scanning?<Scanner onScan={onScan} onClose={()=>setScanning(false)}/>:
      scanned?<div style={{background:C.successBg,borderRadius:18,padding:22,border:`2px solid ${C.success}`,textAlign:'center'}}><div style={{fontSize:44,marginBottom:8}}>✅</div><div style={{fontSize:13,fontWeight:800,color:C.success}}>Scanned!</div><div style={{fontSize:18,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{chip}</div></div>:
      <><div onClick={()=>setScanning(true)} style={{width:'100%',minHeight:180,borderRadius:22,background:C.card,border:`2px dashed ${C.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,cursor:'pointer',textAlign:'center'}}><div style={{fontSize:48,marginBottom:10}}>📷</div><div style={{fontSize:15,fontWeight:900}}>Scan barcode</div><div style={{fontSize:12,color:C.textLight,marginTop:4}}>Point camera at chip barcode</div></div>
      <div style={{textAlign:'center',marginTop:14}}><button onClick={()=>setManual(!manual)} style={{background:'none',border:'none',color:C.primary,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>⌨️ Type manually</button></div>
      {manual&&<div style={{marginTop:12}}><input value={chip} onChange={e=>setChip(e.target.value)} placeholder="Chip number..." style={{width:'100%',padding:'14px',borderRadius:14,border:`2px solid ${C.primary}`,fontSize:17,fontFamily:"'JetBrains Mono',monospace",outline:'none',boxSizing:'border-box',textAlign:'center'}}/><Btn primary full onClick={()=>{if(chip.length>=9){setScanned(true);setTimeout(()=>setStep(1),400)}}} disabled={chip.length<9} style={{marginTop:10}}>Confirm</Btn></div>}</>}
    </div>}

    {step===1&&<div>
      <div style={{background:C.successBg,borderRadius:10,padding:'8px 12px',marginBottom:16,fontSize:12,fontWeight:700,color:C.success,fontFamily:"'JetBrains Mono',monospace"}}>📟 {chip}</div>
      <div onClick={()=>fileRef.current?.click()} style={{width:'100%',height:160,borderRadius:18,background:photoPreview?'transparent':C.card,border:photoPreview?'none':`2px dashed ${C.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',marginBottom:14,overflow:'hidden',position:'relative'}}>
        {photoPreview?<img src={photoPreview} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<><div style={{fontSize:36,marginBottom:6}}>🐾</div><div style={{fontSize:13,fontWeight:800}}>Tap to add pet photo</div><div style={{fontSize:11,color:C.textLight}}>Camera or gallery</div></>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{display:'none'}}/>
      <div style={{fontSize:11,fontWeight:800,color:C.textLight,marginBottom:8}}>ANIMAL</div>
      <div style={{display:'flex',gap:6,marginBottom:10}}>{[['cat','🐱'],['dog','🐕'],['other','🐾']].map(([v,i])=><button key={v} onClick={()=>u('species',v)} style={{flex:1,padding:'10px',borderRadius:12,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Nunito',sans-serif",border:form.species===v?'none':`1.5px solid ${C.border}`,background:form.species===v?C.primary:C.card,color:form.species===v?'#fff':C.text}}>{i} {v}</button>)}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <input value={form.animal_name} onChange={e=>u('animal_name',e.target.value)} placeholder="Name *" style={{padding:'12px',borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:'none',background:C.bg}}/>
        <input value={form.color} onChange={e=>u('color',e.target.value)} placeholder="Color" style={{padding:'12px',borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:'none',background:C.bg}}/>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14}}>{[['female','♀'],['male','♂']].map(([v,i])=><button key={v} onClick={()=>u('sex',v)} style={{flex:1,padding:'10px',borderRadius:12,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:"'Nunito',sans-serif",border:form.sex===v?'none':`1.5px solid ${C.border}`,background:form.sex===v?C.primary:C.card,color:form.sex===v?'#fff':C.text}}>{i} {v}</button>)}</div>
      <Btn primary full onClick={()=>setStep(2)} disabled={!form.animal_name}>Next → Owner</Btn>
    </div>}

    {step===2&&<div>
      <div style={{background:C.successBg,borderRadius:10,padding:'8px 12px',marginBottom:16,fontSize:12,fontWeight:700,color:C.success}}>📟 {chip} · 🐾 {form.animal_name}</div>
      <div style={{fontSize:11,fontWeight:800,color:C.textLight,marginBottom:8}}>👤 OWNER</div>
      {[{k:'owner_name',p:'Full name *'},{k:'owner_phone',p:'Phone *'},{k:'owner_email',p:'Email'},{k:'owner_city',p:'City'}].map(x=><input key={x.k} value={form[x.k]} onChange={e=>u(x.k,e.target.value)} placeholder={x.p} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:'none',background:C.bg,marginBottom:8,boxSizing:'border-box'}}/>)}
      <Btn primary full onClick={()=>setStep(3)} disabled={!form.owner_name||!form.owner_phone} style={{marginTop:4}}>Next → Review</Btn>
      <div style={{textAlign:'center',marginTop:10}}><Btn small onClick={()=>setStep(1)}>← Back</Btn></div>
    </div>}

    {step===3&&<div>
      <div style={{background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:900,marginBottom:10}}>📋 Review</div>
        {photoPreview&&<img src={photoPreview} style={{width:'100%',height:100,objectFit:'cover',borderRadius:10,marginBottom:10}}/>}
        <div style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:C.primary,background:C.primaryLight,padding:'6px 10px',borderRadius:8,marginBottom:8,fontWeight:700}}>📟 {chip}</div>
        <div style={{fontSize:14,fontWeight:900}}>{form.animal_name}</div>
        <div style={{fontSize:12,color:C.textMid}}>{form.color} · {form.species} · {form.sex}</div>
        <div style={{borderTop:`1px solid ${C.border}`,marginTop:10,paddingTop:10,fontSize:12,color:C.textMid}}>
          <div>👤 {form.owner_name}</div><div>📞 {form.owner_phone}</div>
          {form.owner_email&&<div>📧 {form.owner_email}</div>}
          {form.owner_city&&<div>📍 {form.owner_city}</div>}
        </div>
      </div>
      <div style={{background:'#FFFBEB',borderRadius:16,padding:16,border:'1px solid #FDE68A',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:900,color:'#92400E',marginBottom:8}}>🔒 GDPR Consent</div>
        <div onClick={()=>setGdpr(!gdpr)} style={{display:'flex',gap:10,cursor:'pointer'}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${gdpr?C.success:'#D97706'}`,background:gdpr?C.success:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13,fontWeight:900,flexShrink:0}}>{gdpr?'✓':''}</div>
          <div style={{fontSize:11,color:'#92400E',lineHeight:1.5}}>The owner authorizes Pawsy to store personal data for pet identification. Data shared only with verified professionals. Owner can request deletion anytime.</div>
        </div>
      </div>
      <Btn primary full onClick={register} disabled={!gdpr||saving}>{saving?'Saving...':'✅ Register — Free'}</Btn>
      <div style={{textAlign:'center',marginTop:10}}><Btn small onClick={()=>setStep(2)}>← Back</Btn></div>
    </div>}
  </div>)
}

// ═══ SEARCH ═══
function Search({role,user,show}){
  const[q,setQ]=useState('')
  const[r,setR]=useState(null)
  const[loading,setL]=useState(false)
  const[scanning,setS]=useState(false)
  const priv=role==='vet'||role==='shelter'

  const search=async num=>{
    const v=(num||q).trim();if(!v)return;setQ(v);setL(true);setR(null)
    const res=await searchMicrochip(v)
    setR(res.found?{found:true,d:res.data}:{found:false});setL(false)
  }

  return(
  <div style={{padding:'0 20px'}}>
    <h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:16}}>🔍 Search Microchip</h2>
    {scanning?<div style={{marginBottom:14}}><Scanner onScan={c=>{setS(false);search(c)}} onClose={()=>setS(false)}/></div>:
    <button onClick={()=>setS(true)} style={{width:'100%',padding:'14px',borderRadius:16,marginBottom:10,background:C.card,border:`2px dashed ${C.border}`,cursor:'pointer',textAlign:'center',fontFamily:"'Nunito',sans-serif"}}><span style={{fontSize:26}}>📷</span><div style={{fontSize:13,fontWeight:800,marginTop:4}}>Scan barcode</div></button>}
    <div style={{textAlign:'center',fontSize:12,color:C.textLight,marginBottom:8,fontWeight:600}}>or type number</div>
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="e.g., 941000024680135" style={{flex:1,padding:'14px',borderRadius:14,border:`2px solid ${C.border}`,fontSize:15,fontFamily:"'JetBrains Mono',monospace",outline:'none',background:C.card,boxSizing:'border-box'}}/>
      <Btn primary onClick={()=>search()}>{loading?'...':'🔍'}</Btn>
    </div>

    {r?.found&&<div style={{background:C.successBg,borderRadius:20,padding:20,border:`2px solid ${C.success}`,marginBottom:16}}>
      <span style={{fontSize:11,fontWeight:900,color:'#fff',background:C.success,padding:'4px 12px',borderRadius:10}}>✓ FOUND</span>
      <div style={{marginTop:14,display:'flex',gap:14,alignItems:'center',marginBottom:14}}>
        {r.d.photo_url?<img src={r.d.photo_url} style={{width:60,height:60,borderRadius:16,objectFit:'cover',border:`2px solid ${C.success}`}}/>:
        <div style={{width:60,height:60,borderRadius:16,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,border:`2px solid ${C.success}`}}>{r.d.species==='dog'?'🐕':'🐱'}</div>}
        <div><div style={{fontSize:20,fontWeight:900}}>{r.d.animal_name}</div><div style={{fontSize:13,color:C.textMid}}>{r.d.color} · {r.d.sex==='female'?'♀':'♂'}</div></div>
      </div>
      <div style={{borderTop:`1px solid ${C.success}`,paddingTop:14}}>
        {priv?<><div style={{fontSize:11,fontWeight:800,color:C.success,marginBottom:6}}>OWNER ({role} access)</div>
          <div style={{fontSize:14,marginBottom:4}}>👤 {r.d.owner_name}</div>
          {r.d.owner_city&&<div style={{fontSize:14,marginBottom:4}}>📍 {r.d.owner_city}</div>}
          {r.d.owner_phone&&<a href={`tel:${r.d.owner_phone}`} style={{fontSize:14,color:C.primary,fontWeight:800,display:'block',marginBottom:4,textDecoration:'none'}}>📞 {r.d.owner_phone}</a>}
          {r.d.owner_email&&<div style={{fontSize:14}}>📧 {r.d.owner_email}</div>}</>:
        <><div style={{fontSize:11,fontWeight:800,color:C.success,marginBottom:6}}>PET INFO (public)</div>
          {r.d.owner_city&&<div style={{fontSize:14,marginBottom:10}}>📍 Registered in {r.d.owner_city}</div>}
          <div style={{background:'#fff',borderRadius:12,padding:12,border:`1px solid ${C.success}`}}>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.5,marginBottom:10}}>🔒 Owner details protected. Tap below to notify them.</div>
            <Btn primary full small onClick={()=>show('🔔 Owner notified!')}>🔔 Notify: "I found your pet!"</Btn>
          </div></>}
      </div>
    </div>}

    {r&&!r.found&&<div style={{background:'#FEF3C7',borderRadius:20,padding:20,border:'2px solid #FDE68A'}}>
      <div style={{fontSize:16,fontWeight:900,color:'#92400E',marginBottom:8}}>Not found</div>
      <div style={{fontSize:12,color:'#92400E',lineHeight:1.6}}>Try external registries: REIAC (🇪🇸), Europetnet (🇪🇺), Animal-ID.net (🌍 117 registries)</div>
    </div>}
  </div>)
}

// ═══ PROFILE ═══
function Profile({user,go,show,setEdit}){
  const[pets,setPets]=useState([])
  const[loading,setL]=useState(true)

  useEffect(()=>{if(user)(async()=>{const p=await getMyPets(user.id);setPets(p);setL(false)})()},[user])

  const remove=async(id)=>{
    if(!confirm('Delete this registration?'))return
    await deletePet(id);setPets(p=>p.filter(x=>x.id!==id));show('🗑️ Deleted')
  }

  return(
  <div style={{padding:'0 20px'}}>
    <div style={{textAlign:'center',marginBottom:24}}>
      <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 12px',overflow:'hidden',border:`3px solid ${C.primary}`,background:C.border}}>
        {user?.user_metadata?.avatar_url?<img src={user.user_metadata.avatar_url} style={{width:80,height:80}} referrerPolicy="no-referrer"/>:<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:36}}>👤</div>}
      </div>
      <div style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif"}}>{user?.user_metadata?.full_name||'User'}</div>
      <div style={{fontSize:12,color:C.textLight}}>{user?.email}</div>
    </div>

    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
      <h3 style={{fontSize:16,fontWeight:900}}>My Registered Pets ({pets.length})</h3>
    </div>

    {loading?<div style={{textAlign:'center',padding:30,color:C.textLight}}>Loading...</div>:
    pets.length===0?<div style={{textAlign:'center',padding:30,background:C.card,borderRadius:18,border:`1px solid ${C.border}`}}><div style={{fontSize:40,marginBottom:8}}>🐾</div><div style={{fontSize:14,fontWeight:700,color:C.textLight}}>No pets registered yet</div><Btn primary small onClick={()=>go('register')} style={{marginTop:14}}>Register your first pet</Btn></div>:
    pets.map(p=>(
      <div key={p.id} style={{background:C.card,borderRadius:16,padding:14,border:`1px solid ${C.border}`,marginBottom:10,display:'flex',gap:12,alignItems:'center'}}>
        {p.photo_url?<img src={p.photo_url} style={{width:56,height:56,borderRadius:14,objectFit:'cover'}}/>:
        <div style={{width:56,height:56,borderRadius:14,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{p.species==='dog'?'🐕':'🐱'}</div>}
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:900}}>{p.animal_name}</div>
          <div style={{fontSize:11,color:C.textLight,fontFamily:"'JetBrains Mono',monospace"}}>{p.chip_number}</div>
          <div style={{fontSize:11,color:C.textLight}}>👤 {p.owner_name}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <button onClick={()=>setEdit(p)} style={{background:C.infoBg,border:'none',borderRadius:8,padding:'6px 10px',fontSize:11,fontWeight:800,color:C.info,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>✏️</button>
          <button onClick={()=>remove(p.id)} style={{background:C.primaryLight,border:'none',borderRadius:8,padding:'6px 10px',fontSize:11,fontWeight:800,color:C.urgent,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>🗑️</button>
        </div>
      </div>
    ))}

    <button onClick={()=>go('settings')} style={{display:'flex',alignItems:'center',gap:12,padding:'16px',width:'100%',background:C.card,borderRadius:14,border:`1px solid ${C.border}`,cursor:'pointer',textAlign:'left',fontFamily:"'Nunito',sans-serif",marginTop:20}}>
      <span style={{fontSize:20}}>⚙️</span><div style={{flex:1,fontSize:14,fontWeight:800}}>Settings</div><span style={{color:C.textLight}}>›</span>
    </button>
  </div>)
}

// ═══ EDIT PET ═══
function EditPetScreen({pet,show,back}){
  const[f,sF]=useState(pet?{animal_name:pet.animal_name||'',color:pet.color||'',sex:pet.sex||'unknown',species:pet.species||'cat',owner_name:pet.owner_name||'',owner_phone:pet.owner_phone||'',owner_email:pet.owner_email||'',owner_city:pet.owner_city||''}:{})
  const[saving,setSaving]=useState(false)

  const save=async()=>{
    setSaving(true);await updatePet(pet.id,f);setSaving(false);show('✅ Updated!');back()
  }

  if(!pet)return null
  return(
  <div style={{padding:'0 20px'}}>
    <h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:4}}>Edit Registration</h2>
    <div style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:C.primary,background:C.primaryLight,padding:'8px 12px',borderRadius:10,marginBottom:16,fontWeight:700}}>📟 {pet.chip_number}</div>
    <div style={{background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:800,color:C.textLight,marginBottom:8}}>🐾 ANIMAL</div>
      {[{k:'animal_name',p:'Name'},{k:'color',p:'Color'}].map(x=><input key={x.k} value={f[x.k]} onChange={e=>sF({...f,[x.k]:e.target.value})} placeholder={x.p} style={{width:'100%',padding:'12px',borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:'none',background:C.bg,marginBottom:8,boxSizing:'border-box'}}/>)}
      <div style={{fontSize:11,fontWeight:800,color:C.textLight,marginBottom:8,marginTop:8}}>👤 OWNER</div>
      {[{k:'owner_name',p:'Name'},{k:'owner_phone',p:'Phone'},{k:'owner_email',p:'Email'},{k:'owner_city',p:'City'}].map(x=><input key={x.k} value={f[x.k]} onChange={e=>sF({...f,[x.k]:e.target.value})} placeholder={x.p} style={{width:'100%',padding:'12px',borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:'none',background:C.bg,marginBottom:8,boxSizing:'border-box'}}/>)}
    </div>
    <Btn primary full onClick={save} disabled={saving}>{saving?'Saving...':'💾 Save Changes'}</Btn>
  </div>)
}

// ═══ SETTINGS ═══
function Settings({user,go}){
  const logout=async()=>{await signOut();go('home')}
  return(
  <div style={{padding:'0 20px'}}>
    <h2 style={{fontSize:20,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:20}}>⚙️ Settings</h2>
    {[{icon:'👤',l:'Account',d:user?.email},
      {icon:'🔒',l:'Privacy Policy',d:'How we protect your data'},
      {icon:'📄',l:'Terms of Service',d:'Usage terms'},
      {icon:'ℹ️',l:'About Pawsy',d:'Version 5.0 — Free forever'},
    ].map((i,idx)=><div key={idx} style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:C.card,borderRadius:14,border:`1px solid ${C.border}`,marginBottom:8}}><span style={{fontSize:20}}>{i.icon}</span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:800}}>{i.l}</div><div style={{fontSize:11,color:C.textLight}}>{i.d}</div></div></div>)}
    <Btn full onClick={logout} style={{marginTop:20,borderColor:C.urgent,color:C.urgent}}>🚪 Sign Out</Btn>
  </div>)
}
