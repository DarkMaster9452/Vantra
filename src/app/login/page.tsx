'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Delete, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { Wordmark } from '@/components/vantra/Primitives'
import { registerBackHandler } from '@/components/tv/backHandler'
import s from './login.module.css'

type LoginProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  has_pin: boolean
}

const PIN_LENGTH = 4

function ProfileAvatar({ profile, large }: { profile: LoginProfile; large?: boolean }) {
  return <span className={`${s.profileAvatar} ${large ? s.profileAvatarLarge : ''}`}>
    {profile.avatar_url && /^data:image\//.test(profile.avatar_url)
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={profile.avatar_url} alt="" />
      : <span>{profile.display_name.slice(0, 1).toUpperCase()}</span>}
  </span>
}

export default function LoginPage() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [profiles, setProfiles] = useState<LoginProfile[] | null>(null)
  const [selected, setSelected] = useState<LoginProfile | null>(null)
  const [pin, setPin] = useState('')
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/profiles', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : { profiles: [] }))
      .then(data => setProfiles((data.profiles || []).filter((profile: LoginProfile) => profile.has_pin)))
      .catch(() => setProfiles([]))
  }, [])

  // Bez profilov s PIN-om rovno e-mailové prihlásenie
  const pinProfiles = profiles || []
  const showEmail = emailMode || (profiles !== null && pinProfiles.length === 0)

  // Späť na ovládači: PIN → výber profilu, e-mail → výber profilu
  useEffect(() => {
    if (!selected && !emailMode) return
    return registerBackHandler(() => {
      setSelected(null); setEmailMode(false); setPin(''); setError('')
      return true
    })
  }, [selected, emailMode])

  function finish() {
    router.replace('/home')
    router.refresh()
  }

  async function pressDigit(digit: string) {
    if (!selected || loading || pin.length >= PIN_LENGTH) return
    const next = pin + digit
    setPin(next); setError('')
    if (next.length < PIN_LENGTH) return
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: selected.id, pin: next }) })
      if (!response.ok) throw new Error()
      finish()
    } catch {
      setError('That PIN didn’t match. Try again.')
      setPin(''); setLoading(false)
    }
  }

  // Fyzické číslice (aj na ovládači s číselníkom) píšu PIN
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) { event.preventDefault(); void pressDigit(event.key) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) })
      if (!response.ok) { setError('Could not sign in. Check your email and password, then try again.'); setLoading(false); return }
      finish()
    } catch {
      setError('Could not connect. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const step = showEmail ? 'email' : selected ? 'pin' : 'profiles'
  const motionProps = { initial: { opacity: 0, y: reduce ? 0 : 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -10 }, transition: { duration: reduce ? 0 : .28, ease: [.2, .8, .2, 1] as const } }

  return <div className={s.page}>
    <div className={s.ambient} aria-hidden="true" />
    <header className={s.header}>
      <span className={s.brand} role="img" aria-label="VANTRA"><Wordmark /></span>
      <span className={s.memberLabel}><LockKeyhole size={12} /> Member access</span>
    </header>
    <main className={s.main}>
      <section className={s.hero} aria-label="Your world of stories">
        <div className={s.artwork} aria-hidden="true">
          <svg viewBox="0 0 680 740" fill="none">
            <defs><linearGradient id="login-beam" x1="120" y1="60" x2="540" y2="640" gradientUnits="userSpaceOnUse"><stop stopColor="#e50914" stopOpacity=".06" /><stop offset=".5" stopColor="#ff2635" stopOpacity=".9" /><stop offset="1" stopColor="#e50914" stopOpacity=".08" /></linearGradient></defs>
            <path d="M95 70 340 665 585 70" stroke="url(#login-beam)" strokeWidth="2" />
            <path d="M126 70 340 590 554 70" stroke="url(#login-beam)" strokeWidth="1" opacity=".25" />
            <path d="M95 70 340 665 585 70" stroke="#e50914" strokeWidth="42" opacity=".025" />
            <ellipse cx="340" cy="400" rx="310" ry="112" stroke="#ffffff" strokeOpacity=".035" transform="rotate(-30 340 400)" />
          </svg>
        </div>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}><span /> A world worth getting lost in</p>
          <p className={s.headline}>Great stories.<br />Your space<span>.</span></p>
          <p className={s.description}>The films you love. The series you stay up for.<br />Your next obsession is waiting.</p>
          <div className={s.categories}><span>Movies</span><i /><span>Series</span><i /><span>Anime</span></div>
        </div>
        <div className={s.heroFoot}><span className={s.line} /><span>Make tonight a good story.</span></div>
      </section>
      <section className={s.formSide} aria-labelledby="login-title">
        <AnimatePresence mode="wait">
          {step === 'profiles' && <motion.div key="profiles" className={s.formInner} {...motionProps}>
            <p className={s.eyebrow}><span /> The good part starts here</p>
            <h1 id="login-title">Who&apos;s watching<span>?</span></h1>
            <p className={s.formIntro}>Choose your profile and enter your PIN.</p>
            <div className={s.profiles}>
              {profiles === null ? Array.from({ length: 3 }, (_, index) => <span key={index} className={s.profileSkeleton} />) : pinProfiles.map((profile, index) => <button key={profile.id} type="button" className={s.profile} data-tv-autofocus={index === 0 ? '' : undefined} onClick={() => { setSelected(profile); setPin(''); setError('') }}>
                <ProfileAvatar profile={profile} /><span>{profile.display_name}</span>
              </button>)}
            </div>
            <button type="button" className={s.switchMode} onClick={() => { setEmailMode(true); setError('') }}><Mail size={15} /> Sign in with email instead</button>
          </motion.div>}

          {step === 'pin' && selected && <motion.div key="pin" className={`${s.formInner} ${s.pinStep}`} {...motionProps}>
            <button type="button" className={s.switchMode} onClick={() => { setSelected(null); setPin(''); setError('') }}><ArrowLeft size={15} /> Choose another profile</button>
            <div className={s.pinIdentity}><ProfileAvatar profile={selected} large /><div><p className={s.eyebrow}><span /> Welcome back</p><h1 id="login-title">{selected.display_name}<span>.</span></h1></div></div>
            <div className={s.pinDots} aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>{Array.from({ length: PIN_LENGTH }, (_, index) => <i key={index} data-filled={index < pin.length} />)}</div>
            <p role={error ? 'alert' : 'status'} className={error ? s.error : s.pinHint}>{error || (loading ? 'Signing in…' : 'Enter your 4-digit PIN')}</p>
            <div className={s.pinPad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => <button key={digit} type="button" data-tv-autofocus={digit === '5' ? '' : undefined} disabled={loading} onClick={() => { void pressDigit(digit) }}>{digit}</button>)}
              <button type="button" className={s.pinMuted} aria-label="Back to profiles" onClick={() => { setSelected(null); setPin(''); setError('') }}><ArrowLeft size={20} /></button>
              <button type="button" disabled={loading} onClick={() => { void pressDigit('0') }}>0</button>
              <button type="button" className={s.pinMuted} aria-label="Delete digit" disabled={loading || !pin} onClick={() => { setPin(pin.slice(0, -1)); setError('') }}><Delete size={20} /></button>
            </div>
          </motion.div>}

          {step === 'email' && <motion.div key="email" className={s.formInner} {...motionProps}>
            {pinProfiles.length > 0 && <button type="button" className={s.switchMode} onClick={() => { setEmailMode(false); setError('') }}><ArrowLeft size={15} /> Back to profiles</button>}
            <p className={s.eyebrow}><span /> The good part starts here</p>
            <h1 id="login-title">Welcome back<span>.</span></h1>
            <p className={s.formIntro}>Sign in and find your next great watch.</p>
            <form onSubmit={handleEmail} aria-busy={loading}>
              <div className={s.fieldGroup}>
                <label htmlFor="login-email">Email address</label>
                <div className={s.inputWrap}><Mail size={17} aria-hidden="true" /><input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} /></div>
              </div>
              <div className={s.fieldGroup}>
                <label htmlFor="login-password">Password</label>
                <div className={s.inputWrap}><KeyRound size={17} aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={event => setPassword(event.target.value)} /><button type="button" className={s.passwordToggle} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(show => !show)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              </div>
              {error && <p role="alert" className={s.error}>{error}</p>}
              <button type="submit" className={s.submit} disabled={loading}>{loading ? <><LoaderCircle size={17} className={s.spinner} /> Signing in…</> : <><span>Sign in to VANTRA</span><ArrowRight size={18} /></>}</button>
            </form>
            <div className={s.invitation}><LockKeyhole size={15} aria-hidden="true" /><p>Just for our members.<br /><span>Use the email connected to your invitation.</span></p></div>
          </motion.div>}
        </AnimatePresence>
      </section>
    </main>
    <footer className={s.footer}><span>Your stories. Your pace.</span><span>Movies. Series. Anime.</span></footer>
  </div>
}
