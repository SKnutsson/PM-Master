import { useState } from 'react';
import { AlertCircle, Loader2, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenord måste vara minst 6 tecken'),
});

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Felaktig e-post eller lösenord.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Vänligen bekräfta din e-postadress innan du loggar in.');
        } else {
          setError(error.message);
        }
      }
    } catch {
      setError('Inloggningen misslyckades. Försök igen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="auth-brand-panel hidden lg:flex lg:w-[55%] flex-col justify-center px-16 xl:px-20">
        <h1 className="auth-brand-title text-6xl xl:text-7xl leading-none">
          PM <span className="text-sidebar-primary">Master</span>
        </h1>
        <p className="mt-12 text-[11px] text-sidebar-foreground/60">Developed by S.Knutsson</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-10 text-center">
            <h1 className="auth-brand-title text-5xl leading-none text-foreground">
              PM <span className="text-primary">Master</span>
            </h1>
            <p className="mt-5 text-[11px] text-muted-foreground">Developed by S.Knutsson</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Logga in">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input type="email" aria-label="E-postadress" placeholder="E-postadress" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-11 bg-card" autoFocus required />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input type="password" aria-label="Lösenord" placeholder="Lösenord" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-11 bg-card" required />
            </div>
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}
            <Button type="submit" className="h-12 w-full gap-2 font-semibold" disabled={isLoading || !email || !password}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isLoading ? 'Loggar in...' : 'Logga in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
