import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, BarChart3, CalendarRange, HardHat, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AuthPage } from '@/components/auth/AuthPage';

const features = [
  {
    title: 'Projekt',
    description: 'Skapa, organisera och följ upp alla projekt.',
    icon: FolderOpen,
  },
  {
    title: 'Prognos',
    description: 'Följ försäljning och prognos i realtid.',
    icon: BarChart3,
  },
  {
    title: 'Ganttschema',
    description: 'Planera aktiviteter visuellt och interaktivt.',
    icon: CalendarRange,
  },
  {
    title: 'Resursplanering',
    description: 'Fördela montörer och resurser effektivt.',
    icon: HardHat,
  },
];

const valueProps = [
  'Full kontroll över projekt',
  'Tydlig planering och uppföljning',
  'Allt samlat i ett system',
];

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');

  const openLogin = () => {
    setAuthTab('signin');
    setAuthOpen(true);
  };

  const openSignup = () => {
    setAuthTab('signup');
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-lg font-bold tracking-tight text-foreground">PM Master</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={openLogin}>
              <LogIn className="mr-2 h-4 w-4" />
              Logga in
            </Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openSignup}>
              <UserPlus className="mr-2 h-4 w-4" />
              Skapa konto
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-40 pb-28 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-6xl font-extrabold tracking-tight text-foreground sm:text-7xl"
        >
          PM <span className="text-gradient">Master</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-lg text-lg text-muted-foreground"
        >
          Projektledning, resursplanering och prognos – i ett system.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex gap-4"
        >
          <Button size="lg" className="gradient-primary text-primary-foreground" onClick={openSignup}>
            Kom igång
          </Button>
          <Button size="lg" variant="outline" onClick={openLogin}>
            Logga in
          </Button>
        </motion.div>
      </section>

      {/* Features – icon + text cards */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="flex flex-col items-center rounded-xl border border-border/50 bg-card/60 p-8 text-center backdrop-blur-sm transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Value proposition */}
      <section className="mx-auto max-w-3xl px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-5"
        >
          {valueProps.map((text) => (
            <div key={text} className="flex items-center gap-3 text-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-base font-medium">{text}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-20 text-center">
        <h2 className="text-2xl font-bold text-foreground">Redo att börja?</h2>
        <p className="mt-2 text-muted-foreground">Skapa ett konto kostnadsfritt och kom igång direkt.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" className="gradient-primary text-primary-foreground" onClick={openSignup}>
            Skapa konto
          </Button>
          <Button size="lg" variant="outline" onClick={openLogin}>
            Logga in
          </Button>
        </div>
      </section>

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-md border-border/50 bg-card p-0 [&>button]:text-foreground">
          <AuthPage defaultTab={authTab} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
