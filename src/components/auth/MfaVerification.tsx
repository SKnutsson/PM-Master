import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Factor } from '@supabase/supabase-js';

export function MfaVerification() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const { verifyMfaCode, getMfaFactors, signOut } = useAuth();

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    const factorList = await getMfaFactors();
    const verifiedFactors = factorList.filter(f => f.status === 'verified');
    setFactors(verifiedFactors);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Ange en 6-siffrig kod');
      return;
    }

    if (factors.length === 0) {
      setError('Ingen MFA-faktor hittades');
      return;
    }

    setIsLoading(true);

    const { error } = await verifyMfaCode(code, factors[0].id);
    
    if (error) {
      setError('Felaktig verifieringskod. Försök igen.');
      setCode('');
    }
    
    setIsLoading(false);
  };

  const handleCancel = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-chart-4/20"
            >
              <Shield className="h-8 w-8 text-chart-4" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">Tvåfaktorsverifiering</CardTitle>
              <CardDescription className="mt-2 text-muted-foreground">
                Ange den 6-siffriga koden från din autentiseringsapp
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4 flex-shrink-0" />
                <span>Öppna din autentiseringsapp (t.ex. Google Authenticator) för att hämta koden</span>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="h-12 w-full gradient-primary font-semibold text-primary-foreground transition-all hover:opacity-90"
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifierar...
                    </>
                  ) : (
                    'Verifiera'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 w-full"
                  onClick={handleCancel}
                >
                  Avbryt
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
