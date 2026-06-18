import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import authBg from '@/assets/auth-bg.jpg';

const authSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenord måste vara minst 6 tecken'),
});

export function AuthPage({ defaultTab = 'signin' }: { defaultTab?: 'signin' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultTab);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { signIn, signUp } = useAuth();

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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0f1f1a]">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${authBg})` }}
      />
      {/* Light, airy gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#0f1f1a]/40 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-12 sm:py-6">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">PM</span>
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C7F72]">
            Master
          </span>
        </div>
        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="rounded-md bg-[#1C7F72] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#176b60]"
        >
          {mode === 'signin' ? 'Skapa konto' : 'Logga in'}
        </button>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex min-h-[calc(100vh-180px)] items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-[450px] rounded-md bg-black/75 px-8 py-12 backdrop-blur-sm sm:px-16 sm:py-14"
          >
            <h1 className="mb-7 text-3xl font-bold text-white">
              {mode === 'signin' ? 'Logga in' : 'Skapa konto'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="E-postadress"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="h-14 rounded border-0 bg-white/10 px-4 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-offset-0"
              />
              <Input
                type="password"
                placeholder={mode === 'signup' ? 'Lösenord (minst 6 tecken)' : 'Lösenord'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded border-0 bg-white/10 px-4 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-offset-0"
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 rounded bg-[#e87c03]/15 p-3 text-sm text-[#ffb86b] overflow-hidden"
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
                    className="rounded bg-[#1C7F72]/20 p-3 text-sm text-[#92AE9D] overflow-hidden"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="h-12 w-full rounded bg-[#1C7F72] text-base font-semibold text-white transition-colors hover:bg-[#176b60] disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'signin' ? 'Loggar in...' : 'Skapar konto...'}
                  </>
                ) : mode === 'signin' ? (
                  'Logga in'
                ) : (
                  'Skapa konto'
                )}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/15" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-black/0 px-3 text-xs uppercase tracking-wider text-white/50">
                    eller
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || isLoading}
                className="h-12 w-full rounded bg-white/10 text-base font-medium text-white transition-colors hover:bg-white/20 gap-3"
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

              {mode === 'signin' && (
                <div className="flex items-center justify-between pt-2 text-sm">
                  <label className="flex items-center gap-2 text-white/70 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-white/10 accent-[#1C7F72]"
                    />
                    Kom ihåg mig
                  </label>
                </div>
              )}
            </form>

            <p className="mt-10 text-[15px] text-white/60">
              {mode === 'signin' ? 'Är du ny på PM Master?' : 'Har du redan ett konto?'}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                  setSuccess('');
                }}
                className="font-medium text-white hover:underline"
              >
                {mode === 'signin' ? 'Skapa konto nu.' : 'Logga in.'}
              </button>
            </p>

            <p className="mt-4 text-xs leading-relaxed text-white/40">
              Projektledning, resursplanering och prognos — allt samlat i ett kraftfullt system.
            </p>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/60 px-6 py-6 text-center text-xs tracking-wider text-white/40 sm:px-12">
        Developed by S. Knutsson
      </footer>
    </div>
  );
}
