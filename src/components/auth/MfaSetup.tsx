import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Loader2, CheckCircle2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MfaSetupProps {
  onSuccess?: () => void;
}

export function MfaSetup({ onSuccess }: MfaSetupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'success'>('intro');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { enrollMfa, verifyMfaEnrollment, mfaEnrolled } = useAuth();

  const handleStartEnrollment = async () => {
    setIsLoading(true);
    setError('');

    const result = await enrollMfa();

    if ('error' in result) {
      setError(result.error.message);
    } else {
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setFactorId(result.factorId);
      setStep('qr');
    }

    setIsLoading(false);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Ange en 6-siffrig kod');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error } = await verifyMfaEnrollment(code, factorId);

    if (error) {
      setError('Felaktig verifieringskod. Försök igen.');
      setCode('');
    } else {
      setStep('success');
      onSuccess?.();
    }

    setIsLoading(false);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep('intro');
      setQrCode('');
      setSecret('');
      setFactorId('');
      setCode('');
      setError('');
    }, 300);
  };

  if (mfaEnrolled) {
    return (
      <div className="flex items-center gap-2 text-sm text-status-completed">
        <CheckCircle2 className="h-4 w-4" />
        <span>Tvåfaktorsautentisering aktiverad</span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="h-4 w-4" />
          Aktivera tvåfaktorsautentisering
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-chart-4" />
            {step === 'intro' && 'Aktivera tvåfaktorsautentisering'}
            {step === 'qr' && 'Skanna QR-koden'}
            {step === 'verify' && 'Verifiera koden'}
            {step === 'success' && 'Aktivering slutförd!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Lägg till ett extra säkerhetslager genom att använda en autentiseringsapp.'}
            {step === 'qr' && 'Använd din autentiseringsapp för att skanna QR-koden.'}
            {step === 'verify' && 'Ange koden från din autentiseringsapp för att slutföra aktiveringen.'}
            {step === 'success' && 'Tvåfaktorsautentisering har aktiverats för ditt konto.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'intro' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Så här fungerar det:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Ladda ner en autentiseringsapp (t.ex. Google Authenticator eller Authy)</li>
                  <li>Skanna QR-koden med appen</li>
                  <li>Ange den 6-siffriga koden för att verifiera</li>
                </ol>
              </div>
              <Button
                onClick={handleStartEnrollment}
                disabled={isLoading}
                className="w-full gradient-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Förbereder...
                  </>
                ) : (
                  'Påbörja aktivering'
                )}
              </Button>
            </motion.div>
          )}

          {step === 'qr' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <div className="rounded-lg border border-border p-4 bg-white">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Kan du inte skanna? Ange koden manuellt:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted rounded px-3 py-2 text-sm font-mono break-all">
                    {secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setStep('verify')}
                className="w-full gradient-primary"
              >
                Jag har skannat koden
              </Button>
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('qr')}
                  className="flex-1"
                >
                  Tillbaka
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={isLoading || code.length !== 6}
                  className="flex-1 gradient-primary"
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
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-completed/20">
                <CheckCircle2 className="h-8 w-8 text-status-completed" />
              </div>
              <p className="text-sm text-muted-foreground">
                Från och med nu behöver du verifiera med din autentiseringsapp när du loggar in.
              </p>
              <Button onClick={handleClose} className="w-full">
                Stäng
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
