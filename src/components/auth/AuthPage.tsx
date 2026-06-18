import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, ArrowRight, Sparkles, ShieldCheck, BarChart3, Calendar } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenord måste vara minst 6 tecken'),
});

const FONT_STACK = "'Space Grotesk', system-ui, sans-serif";
const BODY_STACK = "'DM Sans', system-ui, sans-serif";

export function AuthPage({ defaultTab = 'signin' }: { defaultTab?: 'signin' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultTab);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [time, setTime] = useState(new Date());
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setError(result.error.message || 'Google-inloggning misslyckades.');
    }
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Felaktigt e-post eller lösenord.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Vänligen bekräfta din e-postadress innan du loggar in.');
        } else {
          setError(error.message);
        }
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Denna e-postadress är redan registrerad.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Konto skapat! Kontrollera din e-post för att bekräfta kontot.');
        setEmail('');
        setPassword('');
      }
    }

    setIsLoading(false);
  };

  const timeStr = time.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-[#0a0f0d] text-white"
      style={{ fontFamily: BODY_STACK }}
    >
      {/* === Cinematic background === */}
      <div className="absolute inset-0 bg-[#0a0f0d]" />

      {/* Aurora blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-[640px] w-[640px] rounded-full opacity-60 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #1C7F72 0%, transparent 70%)' }}
        animate={{ x: [0, 80, 0], y: [0, 60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 h-[700px] w-[700px] rounded-full opacity-50 blur-[140px]"
        style={{ background: 'radial-gradient(circle, #0d7a5f 0%, transparent 70%)' }}
        animate={{ x: [0, -60, 0], y: [0, -80, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/4 h-[600px] w-[600px] rounded-full opacity-40 blur-[130px]"
        style={{ background: 'radial-gradient(circle, #92AE9D 0%, transparent 70%)' }}
        animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #92AE9D 1px, transparent 1px), linear-gradient(to bottom, #92AE9D 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Noise / vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f0d]/40 to-[#06090a]" />

      {/* === Top bar === */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1C7F72] to-[#0d7a5f] shadow-lg shadow-[#1C7F72]/30">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
          </div>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: FONT_STACK }}
          >
            PM<span className="text-[#92AE9D]">Master</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden items-center gap-6 text-xs font-medium text-white/50 sm:flex"
        >
          <span className="tabular-nums tracking-wider">{timeStr}</span>
          <span className="capitalize">{dateStr}</span>
          <div className="flex items-center gap-1.5 rounded-full border border-[#1C7F72]/30 bg-[#1C7F72]/10 px-3 py-1 text-[#92AE9D]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1C7F72] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1C7F72]" />
            </span>
            System online
          </div>
        </motion.div>
      </header>

      {/* === Main === */}
      <main className="relative z-10 flex min-h-[calc(100vh-180px)] items-center justify-center px-4 py-6">
        <div className="w-full max-w-[440px]">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-6 flex justify-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1C7F72]" />
              Säker inloggning · End-to-end krypterad
            </div>
          </motion.div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + '-head'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mb-8 text-center"
            >
              <h1
                className="text-[44px] leading-[1.05] font-bold tracking-tight"
                style={{ fontFamily: FONT_STACK }}
              >
                {mode === 'signin' ? (
                  <>
                    Välkommen
                    <br />
                    <span className="bg-gradient-to-r from-[#1C7F72] via-[#3da897] to-[#92AE9D] bg-clip-text text-transparent">
                      tillbaka.
                    </span>
                  </>
                ) : (
                  <>
                    Skapa ditt
                    <br />
                    <span className="bg-gradient-to-r from-[#1C7F72] via-[#3da897] to-[#92AE9D] bg-clip-text text-transparent">
                      konto.
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-4 text-[15px] text-white/55">
                {mode === 'signin'
                  ? 'Logga in för att fortsätta med dina projekt.'
                  : 'Kom igång med PM Master på under en minut.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#1C7F72]/40 via-transparent to-[#92AE9D]/20 opacity-60 blur-xl" />

            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 backdrop-blur-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">
                    E-post
                  </label>
                  <Input
                    type="email"
                    placeholder="namn@foretag.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="h-12 rounded-lg border border-white/10 bg-black/30 px-4 text-[15px] text-white placeholder:text-white/30 focus-visible:bg-black/40 focus-visible:ring-2 focus-visible:ring-[#1C7F72]/40 focus-visible:ring-offset-0 focus-visible:border-[#1C7F72]/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Lösenord
                  </label>
                  <Input
                    type="password"
                    placeholder={mode === 'signup' ? 'Minst 6 tecken' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg border border-white/10 bg-black/30 px-4 text-[15px] text-white placeholder:text-white/30 focus-visible:bg-black/40 focus-visible:ring-2 focus-visible:ring-[#1C7F72]/40 focus-visible:ring-offset-0 focus-visible:border-[#1C7F72]/50 transition-colors"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 overflow-hidden"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-[#1C7F72]/30 bg-[#1C7F72]/10 p-3 text-sm text-[#92AE9D] overflow-hidden"
                    >
                      {success}
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === 'signin' && (
                  <div className="flex items-center justify-between pt-1 text-sm">
                    <label className="flex items-center gap-2 text-white/60 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-white/10 accent-[#1C7F72]"
                      />
                      Kom ihåg mig
                    </label>
                    <button
                      type="button"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      Glömt lösenord?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="group relative h-12 w-full overflow-hidden rounded-lg bg-gradient-to-r from-[#1C7F72] to-[#0d7a5f] text-base font-semibold text-white shadow-lg shadow-[#1C7F72]/30 transition-all hover:shadow-xl hover:shadow-[#1C7F72]/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mode === 'signin' ? 'Loggar in...' : 'Skapar konto...'}
                      </>
                    ) : (
                      <>
                        {mode === 'signin' ? 'Logga in' : 'Skapa konto'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#0a0f0d] px-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
                      eller
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || isLoading}
                  className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.04] text-[15px] font-medium text-white transition-colors hover:bg-white/[0.08] gap-3"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Fortsätt med Google
                </Button>
              </form>
            </div>
          </motion.div>

          {/* Switch mode */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-sm text-white/50"
          >
            {mode === 'signin' ? 'Är du ny på PM Master?' : 'Har du redan ett konto?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setSuccess('');
              }}
              className="font-medium text-white underline-offset-4 hover:underline"
            >
              {mode === 'signin' ? 'Skapa konto' : 'Logga in'}
            </button>
          </motion.p>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 grid grid-cols-3 gap-3 text-center"
          >
            {[
              { icon: ShieldCheck, label: 'GDPR' },
              { icon: BarChart3, label: 'Realtid' },
              { icon: Calendar, label: '24/7' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] py-3 backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 text-[#92AE9D]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-6 text-center text-[11px] uppercase tracking-[0.2em] text-white/30 sm:px-12">
        Developed by S. Knutsson · © {new Date().getFullYear()} PM Master
      </footer>
    </div>
  );
}
