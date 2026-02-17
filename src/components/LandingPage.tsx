import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CalendarRange, Users, TrendingUp, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AuthPage } from '@/components/auth/AuthPage';

import previewProjects from '@/assets/preview-projects.jpg';
import previewGantt from '@/assets/preview-gantt.jpg';
import previewResources from '@/assets/preview-resources.jpg';
import previewForecast from '@/assets/preview-forecast.jpg';

const features = [
  {
    title: 'Projekt',
    description: 'Lägg enkelt upp nya projekt och projektinformation.',
    icon: BarChart3,
    image: previewProjects,
  },
  {
    title: 'Ganttschema',
    description: 'Visualisera tidslinjer och aktiviteter i ett interaktivt schema.',
    icon: CalendarRange,
    image: previewGantt,
  },
  {
    title: 'Resursplanering',
    description: 'Fördela arbetskraft och planera arbetstid per projekt.',
    icon: Users,
    image: previewResources,
  },
  {
    title: 'Prognos',
    description: 'Följ upp försäljning och offertstock.',
    icon: TrendingUp,
    image: previewForecast,
  },
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
      <section className="flex flex-col items-center justify-center px-6 pt-40 pb-24 text-center">
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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/30"
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={f.image}
                  alt={f.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex items-start gap-3 p-5">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
