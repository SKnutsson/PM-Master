import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, Mail, KeyRound, ArrowRight } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenord måste vara minst 6 tecken')
});


export function AuthPage({ defaultTab = 'signin' }: {defaultTab?: 'signin' | 'signup';}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mode = 'signin' as const;
  const { signIn } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const policyConsent = true;

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin
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

    const { error, mfaRequired } = await signIn(email, password);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Felaktigt e-post eller lösenord.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Vänligen bekräfta din e-postadress innan du loggar in.');
      } else {
        setError(error.message);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand / visual */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[hsl(168_30%_16%)] via-[hsl(160_35%_22%)] to-[hsl(168_40%_10%)]">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsl(160_55%_36%/0.08)] blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[hsl(160_55%_36%/0.06)] blur-3xl translate-y-1/4 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-[hsl(160_55%_36%/0.04)] blur-2xl -translate-x-1/2 -translate-y-1/2" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>


        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}>
            
            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              PM <span className="text-[hsl(160_55%_50%)]">Master</span>
            </h1>
            <p className="mt-5 text-lg text-white/50 max-w-md leading-relaxed">
              Projektledning, resursplanering och prognos – allt samlat i ett kraftfullt system.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-12 space-y-4">
            
            {[
            'Överblick och kontroll i realtid',
            'Aktivitets- och resursplanering',
            'Visuella Ganttscheman och prognoser'].
            map((text, i) =>
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3">
              
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(160_55%_36%/0.2)]">
                  <ArrowRight className="h-3.5 w-3.5 text-[hsl(160_55%_50%)]" />
                </div>
                <span className="text-sm text-white/60 font-medium">{text}</span>
              </motion.div>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-16 text-[11px] text-white/20 tracking-wider uppercase">
            
            Developed by S. Knutsson
          </motion.p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-primary/[0.03] blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 w-full max-w-[400px]">
          
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              PM <span className="text-primary">Master</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Projektledning i ett system
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}>
                
                <h2 className="text-2xl font-bold text-foreground">Välkommen</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Logga in för att fortsätta till dina projekt
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Google button */}
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full gap-3 border-border bg-card hover:bg-muted transition-all duration-200 mb-6"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || isLoading}>
            
            {googleLoading ?
            <Loader2 className="h-4 w-4 animate-spin" /> :

            <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            }
            Fortsätt med Google
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground/60 tracking-wider">eller med e-post</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="relative group">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focused === 'email' ? 'text-primary' : 'text-muted-foreground'}`} />
                <Input
                  type="email"
                  placeholder="E-postadress"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="h-12 pl-11 bg-card border-border focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  autoFocus />
                
              </div>
              <div className="relative group">
                <KeyRound className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focused === 'password' ? 'text-primary' : 'text-muted-foreground'}`} />
                <Input
                  type="password"
                  placeholder="Lösenord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="h-12 pl-11 bg-card border-border focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" />
                
              </div>
            </div>

            <AnimatePresence>
              {error &&
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive overflow-hidden">
                
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              }

              {success &&
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-lg bg-status-completed/10 p-3 text-sm text-status-completed overflow-hidden">
                
                  {success}
                </motion.div>
              }
            </AnimatePresence>

            <Button
              type="submit"
              className="h-12 w-full gradient-primary font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-primary/20"
              disabled={isLoading || !email || !password}>
              {isLoading ?
              <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loggar in...
                </> :
              <span className="flex items-center gap-2">
                  Logga in
                  <ArrowRight className="h-4 w-4" />
                </span>
              }
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Detta är ett internt system. Konton skapas av administratör.
          </p>
        </motion.div>
      </div>
    </div>);

}